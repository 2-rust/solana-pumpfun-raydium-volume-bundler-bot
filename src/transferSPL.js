import { PublicKey, Keypair, Connection, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import sendBundle from './sendBundle.js';
import createATA from './pumpATA.js';

import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';

import bs58 from 'bs58';
import chalk from 'chalk';

async function sendSPL(ca, sendTo) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const blockEngineURL = config.blockEngineURL;
    const jitoTip = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jitoTip)));
    const jitoTipAmount = config.jitoTipAmount;
    const jitoTipLamports = jitoTipAmount * 1e9;
    const receiver = new PublicKey(sendTo);
    const token = new PublicKey(ca);

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const wallets = await loadWallets();
    const walletsPerVTX = 6;
    const vtxPerBundle = 4;

    const receiverATA = spl.getAssociatedTokenAddressSync(
        token,
        receiver,
        false,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const receiverATAIX = spl.createAssociatedTokenAccountIdempotentInstruction(
        new PublicKey(wallets[0].pubKey),
        receiverATA,
        receiver,
        token,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Process wallets in groups
    for (let i = 0; i < wallets.length; i += walletsPerVTX * vtxPerBundle) {
        const bundleTransactions = [];

        for (let j = 0; j < vtxPerBundle; j++) {
            const startIndex = i + (j * walletsPerVTX);
            const endIndex = Math.min(startIndex + walletsPerVTX, wallets.length);
            const walletBatch = wallets.slice(startIndex, endIndex);

            const transactions = await Promise.all(walletBatch.map(async (wallet, index) => {
                try {
                    const senderKeypair = Keypair.fromSecretKey(bs58.decode(wallet.privKey));
                    const senderPublicKey = senderKeypair.publicKey;
                    const owner = new PublicKey(wallet.pubKey);

                    let walletBalance = await connection.getBalance(owner);
                    let solBalance = walletBalance / 1e9;

                    if (solBalance <= 0.001) {
                        console.log(chalk.red("Wallet SOL balance too low, skipping."));
                        return null;
                    }

                    const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: token });
                    if (tokenAccount.value.length === 0) {
                        console.log(chalk.red("No token account found for this wallet, skipping.\n"));
                        return null;
                    }
                    const tokenAccountPubkey = new PublicKey(tokenAccount.value[0].pubkey);

                    let sendAmount = await connection.getTokenAccountBalance(tokenAccountPubkey);
                    let sendAmountLamports = sendAmount.value.amount;
                    if (sendAmountLamports <= 0) {
                        console.log(chalk.red("Token balance too low (empty), skipping.\n"));
                        return null;
                    }

                    // Create the send instruction
                    const instruction = spl.createTransferInstruction(
                        tokenAccountPubkey,
                        receiverATA,
                        owner,
                        sendAmountLamports,
                        [],
                        spl.TOKEN_PROGRAM_ID
                    );

                    return { instruction, senderKeypair, senderPublicKey };
                } catch (error) {
                    console.error(`Error processing wallet ${wallet.pubKey}:`, error);
                    return null;
                }
            }));

            // Filter out null results
            const validTransactions = transactions.filter(tx => tx !== null);

            if (validTransactions.length === 0) {
                console.log(chalk.yellow("No valid transactions to process in this batch."));
                continue;
            }

            const instructions = validTransactions.map(t => t.instruction);
            const signers = validTransactions.map(t => t.senderKeypair);
            const recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

            // Add receiverATAIX to the first VTX only
            if (j === 0 && i === 0) {
                instructions.unshift(receiverATAIX);
            }

            // Compile to versioned transaction
            const messageV0 = new TransactionMessage({
                payerKey: validTransactions[0].senderPublicKey,
                instructions: instructions,
                recentBlockhash: recentBlockhash
            }).compileToV0Message();

            const versionedTransaction = new VersionedTransaction(messageV0);
            versionedTransaction.sign(signers);

            if (versionedTransaction.serialize().length > 1234) {
                console.log(chalk.red("Transaction size too large."));
                continue;
            }
            bundleTransactions.push(versionedTransaction);
        }

        // Jito setup
        const jitoTipAccounts = [
            '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
            'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
            'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
            'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
            'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
            'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
            'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
            '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'
        ];

        const pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
        const jitoTipAccount = jitoTipAccounts[pickAccount];

        const tipAccount = new PublicKey(jitoTipAccount);
        const jitoBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

        const bund = new Bundle([]);
        bundleTransactions.forEach(tx => bund.addTransactions(tx));
        bund.addTipTx(jitoTip, jitoTipLamports, tipAccount, jitoBlockhash);

        console.log("Number of transactions in the bundle:", bund.transactions.length);
        try {
            const sentBundle = await sendBundle(bund, blockEngineURL);
            console.log(`Confirm Bundle Manually (JITO): https://explorer.jito.wtf/bundle/${sentBundle}`);
        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log("Bundle Landed!");
            } else {
                console.error("Error sending bundle:", error);
            }
        }
    }

    console.log("All bundles processed.");
}
export default sendSPL;