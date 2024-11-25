import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { createSellTX } from './createSellTX.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import GPA from './pumpDecode.js';
import { getBondingCurve } from './getKeys.js';
import sendBundle from './sendBundle.js';
import fetchTokens from './fetchTokens.js';

async function cleanup() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const blockEngineURL = config.blockEngineURL;   
    const tipper = config.jitoTip;
    const tipperKP = Keypair.fromSecretKey(bs58.decode(tipper));
    const jitoTipAmount = config.jitoTipAmount;
    const jitoTipLamports = jitoTipAmount * 1e9; 

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const pump = new PublicKey(PUMP_PUBLIC_KEY);

    const wallets = await loadWallets();
    const batchSize = 10;
    const loops = Math.ceil(wallets.length / batchSize);

    for (let i = 0; i < loops; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batchWallets = wallets.slice(start, end);

        const transactions = [];
        const signers = [];
        const validWallets = [];

        for (let j = 0; j < batchWallets.length; j++) {
            const wallet = batchWallets[j];
            console.log(chalk.green(`Processing wallet ${j + 1}: ${wallet.pubKey}`));

            const tokensHeld = await fetchTokens(wallet.pubKey);

            if (tokensHeld.length === 0) {
                console.log(chalk.red(`No tokens found for wallet: ${wallet.pubKey}`));
                continue;
            }

            for (const token of tokensHeld) {
                const mint = new PublicKey(token.CA);
                let sellAmountLamports = token.balance * 1e6;
                sellAmountLamports = Math.floor(sellAmountLamports);

                if (sellAmountLamports <= 0) {
                    console.log(chalk.red(`Token balance too low (empty), skipping.`));
                    continue;
                }

                const bondingCurvePda = getBondingCurve(mint, pump);
                const bondingCurveAta = getAssociatedTokenAddressSync(mint, bondingCurvePda, true);

                const bCurve = bs58.encode(bondingCurvePda.toBuffer());
                const aCurve = bs58.encode(bondingCurveAta.toBuffer());

                const reserveData = await GPA(bCurve);

                if (!reserveData || reserveData.vTokenReserve === '0' || reserveData.vSolReserve === '0') {
                    console.log(chalk.red(`Unable to sell: ${token.CA}, invalid reserve data (migrated or not found on PF), skipping...`));
                    continue;
                }

                validWallets.push({ wallet, sellAmountLamports, tokenAccountPubKey: token.ATA, mint, bCurve, aCurve });
            }
        }

        if (validWallets.length === 0) {
            console.log(chalk.yellow("No transactions to process in this batch, skipping bundle creation."));
            continue;
        }

        for (let j = 0; j < validWallets.length; j++) {
            const { wallet, sellAmountLamports, tokenAccountPubKey, mint, bCurve, aCurve } = validWallets[j];

            const bondingCurve = new PublicKey(bCurve);
            const aBondingCurve = new PublicKey(aCurve);

            let tx = await createSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey);

            const blockhashObj = await connection.getLatestBlockhash('finalized');
            const recentBlockhash = blockhashObj.blockhash;

            const messageV0 = new TransactionMessage({
                payerKey: tx.payer.publicKey,
                instructions: tx.instructions,
                recentBlockhash: recentBlockhash
            }).compileToV0Message();

            const fullTX = new VersionedTransaction(messageV0);
            fullTX.sign([tx.payer]);
            transactions.push(fullTX);
            signers.push(tx.payer);
        }

        // Rate-limited bundle sending
        if (transactions.length > 0) {
            const bundleSize = 4;
            const bundles = [];

            for (let j = 0; j < transactions.length; j += bundleSize) {
                const bundleTransactions = transactions.slice(j, j + bundleSize);
                const bundle = new Bundle([]);
                for (const tx of bundleTransactions) {
                    bundle.addTransactions(tx);
                }
                bundles.push(bundle);
            }

            console.log(`Created ${bundles.length} bundle(s)`);

            for (let j = 0; j < bundles.length; j++) {
                const bundle = bundles[j];
                const jitoTipAccounts = ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49', 'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'];

                let pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
                let jitoTipAccount = jitoTipAccounts[pickAccount];

                const tipAccount = new PublicKey(jitoTipAccount);
                bundle.addTipTx(tipperKP, jitoTipLamports, tipAccount, (await connection.getLatestBlockhash()).blockhash);
                console.log(`Sending bundle ${j + 1} with ${bundle.transactions.length} transaction(s)`);

                try {
                    // Simulate only the first transaction in the first bundle
                    if (j === 0) {
                        const simulate = await connection.simulateTransaction(bundle.transactions[0]);
                        if (simulate.value.err) {
                            console.log(chalk.red("Error simulating transaction: ", simulate.value.err));
                            break;
                        }
                        console.log(chalk.green("Simulation successful"));
                    }

                    const sentBundle = await sendBundle(bundle, blockEngineURL);
                    console.log(chalk.green(`Sent bundle ${j + 1}: https://explorer.jito.wtf/bundle/${sentBundle}`));
                } catch (error) {
                    if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                        console.log(chalk.yellow(`Bundle ${j + 1} already processed!`));
                    } else {
                        console.error(chalk.red(`Error sending bundle ${j + 1}:`, error));
                    }
                }

                // Add a delay between bundles for ratelimits
                if (j < bundles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 250)); // 250ms delay
                }
            }
        }
    }

    console.log(chalk.green("Cleanup process completed."));
}

async function createTipIX() {
    const config = await loadConfig();
    const tipper = config.jitoTip;
    const tipperKP = Keypair.fromSecretKey(bs58.decode(tipper));
    const jitoTipAmount = config.jitoTipAmount;
    const jitoTipLamports = jitoTipAmount * 1e9;

    const jitoTipAccounts = ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49', 'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'];

    let pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
    let jitoTipAccount = jitoTipAccounts[pickAccount];

    const tipAccount = new PublicKey(jitoTipAccount);



    const tipIX = SystemProgram.transfer({
        fromPubkey: tipperKP.publicKey,
        toPubkey: tipAccount,
        lamports: jitoTipLamports
    });

    return tipIX;
}

export default cleanup;