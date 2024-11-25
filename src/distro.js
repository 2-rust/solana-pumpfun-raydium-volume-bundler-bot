import { PublicKey, Keypair, Connection, TransactionMessage, VersionedTransaction, SystemProgram } from '@solana/web3.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import bs58 from 'bs58';
import sendBundle from './sendBundle.js';
import promptFundAmounts from './fundAmt.js';
import * as fs from 'fs';
import * as path from 'path';

async function distro() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const sender = config.sender;
    const blockEngineURL = config.blockEngineURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const wallets = await loadWallets();
    const senderKeypair = Keypair.fromSecretKey(bs58.decode(sender));
    const senderPublicKey = senderKeypair.publicKey;

    // Prompt user for fund amounts and save to JSON file
    await promptFundAmounts(wallets.length);

    // Read fund amounts from JSON file
    const fundAmountsPath = path.join(process.cwd(), 'fundAmounts.json');
    const fundAmountsData = fs.readFileSync(fundAmountsPath, 'utf8');
    const fundAmounts = JSON.parse(fundAmountsData);

    const WALLETS_PER_VTX = 10;
    const VTX_PER_BUNDLE = 4;

    for (let i = 0; i < wallets.length; i += WALLETS_PER_VTX * VTX_PER_BUNDLE) {
        const bundleTransactions = [];

        for (let j = 0; j < VTX_PER_BUNDLE; j++) {
            const startIndex = i + (j * WALLETS_PER_VTX);
            const endIndex = Math.min(startIndex + WALLETS_PER_VTX, wallets.length);
            const batchWallets = wallets.slice(startIndex, endIndex);

            if (batchWallets.length === 0) break;

            const instructions = batchWallets.map((wallet, index) => {
                const walletIndex = startIndex + index + 1;
                const sendAmount = Math.floor(fundAmounts[`wallet${walletIndex}`] * 1e9); // Convert SOL to lamports
                return SystemProgram.transfer({
                    fromPubkey: senderPublicKey,
                    toPubkey: new PublicKey(wallet.pubKey),
                    lamports: sendAmount
                });
            });

            const recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

            const messageV0 = new TransactionMessage({
                payerKey: senderPublicKey,
                instructions: instructions,
                recentBlockhash: recentBlockhash
            }).compileToV0Message();

            const versionedTransaction = new VersionedTransaction(messageV0);
            versionedTransaction.sign([senderKeypair]);

            bundleTransactions.push(versionedTransaction);
        }

        // Add Jito tip transaction
        const jitoTipAccount = new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5");
        const jitoTip = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jitoTip)));
        const jitoTipAmount = config.jitoTipAmount;
        const jitoTipLamports = jitoTipAmount * 1e9;
        const tipInstruction = SystemProgram.transfer({
            fromPubkey: jitoTip.publicKey,
            toPubkey: jitoTipAccount,
            lamports: jitoTipLamports
        });

        const tipMessageV0 = new TransactionMessage({
            payerKey: jitoTip.publicKey,
            instructions: [tipInstruction],
            recentBlockhash: (await connection.getLatestBlockhash("finalized")).blockhash
        }).compileToV0Message([]);

        const tipTransaction = new VersionedTransaction(tipMessageV0);
        tipTransaction.sign([jitoTip]);

        bundleTransactions.push(tipTransaction);

        const bundle = new Bundle(bundleTransactions);

        console.log("Number of transactions in the bundle:", bundle.transactions.length);

        try {
            const sentBundle = await sendBundle(bundle, blockEngineURL);
            console.log(`Confirm Bundle Manually (JITO): https://explorer.jito.wtf/bundle/${sentBundle}`);
        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log("Bundle Landed!");
                return;
            }
            console.error("Error sending bundle:", error);
        }
    }
}

export default distro;