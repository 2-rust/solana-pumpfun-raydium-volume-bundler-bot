import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import { staggerTX } from './stagger.js';
import { getKeypairFromBs58 } from './raydium/sell.js';
import sendBundle from './sendBundle.js';
import fs from 'fs';
import path from 'path';

process.removeAllListeners('warning');
process.removeAllListeners('ExperimentalWarning');

function getBondingCurve(mint, programId,) {
    const [pda, _] = PublicKey.findProgramAddressSync(
        [
            encode("bonding-curve"),
            mint.toBuffer(),
        ],
        programId,
    )
    return pda
}

async function staggerBuy(ca, delay, useJito, loops) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const minBuy = config.minBuy;
    const maxBuy = config.maxBuy;
    const blockEngineURL = config.blockEngineURL;
    const jitoTipWallet = getKeypairFromBs58(config.jitoTip);
    const jitoTipAmount = config.jitoTipAmount;
    const jitoTipLamports = jitoTipAmount * 1e9;
    const computeLimit = config.computeLimit;
    const computeUnit = config.computeUnit;
    const slippage = config.slippage;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const pumpProgramId = new PublicKey(PUMP_PUBLIC_KEY);
    const mintPubKey = new PublicKey(ca);


    const bondingCurvePda = getBondingCurve(mintPubKey, pumpProgramId);
    const bondingCurveAta = getAssociatedTokenAddressSync(mintPubKey, bondingCurvePda, true);

    const bCurve = bs58.encode(bondingCurvePda.toBuffer());
    const aCurve = bs58.encode(bondingCurveAta.toBuffer());

    const wallets = await loadWallets();

    // Load buy amounts from the JSON file
    let buyAmounts = {};
    const buyAmountsPath = path.resolve(process.cwd(), 'buyAmounts.json');

    if (fs.existsSync(buyAmountsPath)) {
        const rawdata = fs.readFileSync(buyAmountsPath, 'utf8');
        buyAmounts = JSON.parse(rawdata);
    }

    const walletBuyAmounts = wallets.map((wallet, index) => {
        const walletKey = `wallet${index + 1}`;
        let buyAmount;

        if (buyAmounts[walletKey]) {
            buyAmount = buyAmounts[walletKey];
        } else {
            // Generate a random buy amount if not specified in the file
            buyAmount = Math.random() * (maxBuy - minBuy) + minBuy;
            buyAmount = parseFloat(buyAmount.toFixed(3)); // Round to 3 decimal places
        }

        return { wallet, buyAmount };
    });

    let totalBuyVolume = 0;

    for (let i = 0; i < loops; i++) {
        console.log(chalk.green(`Loop ${i + 1}/${loops}`));

        for (const { wallet, buyAmount } of walletBuyAmounts) {
            const owner = new PublicKey(wallet.pubKey);
            const walletSK = getKeypairFromBs58(wallet.privKey);
            const walletBalance = await connection.getBalance(owner);
            const walletBalanceSol = walletBalance / 1e9; // Convert lamports to SOL

            if (walletBalanceSol < 0.01) {
                console.log(chalk.yellow("Wallet SOL balance too low (< 0.01 SOL), skipping."));
                continue;
            }

            let adjustedBuyAmount = buyAmount;

            if (adjustedBuyAmount >= walletBalanceSol) {
                console.log(chalk.red("Wallet SOL balance too low, recalculating amount to buy."));
                adjustedBuyAmount = walletBalanceSol * 0.75;
                adjustedBuyAmount = parseFloat(adjustedBuyAmount.toFixed(4));
                console.log("New Buy Amount: ", adjustedBuyAmount);
                if (adjustedBuyAmount < 0.01) {
                    console.log(chalk.yellow("Skipping as buy won't show up on P.F."));
                    continue;
                }
            }

            const buyAmountLamports = Math.floor(adjustedBuyAmount * 1e9);
            totalBuyVolume += parseFloat(adjustedBuyAmount);

            const mint = new PublicKey(ca);
            const bondingCurve = new PublicKey(bCurve);
            const aBondingCurve = new PublicKey(aCurve);

            console.log(`Wallet: ${wallet.pubKey} - Buy Amount: ${adjustedBuyAmount} SOL`);

            if (useJito) {
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
                const jitoTipAccount = new PublicKey(jitoTipAccounts[pickAccount]);

                // Create tip transaction
                const tipTx = SystemProgram.transfer({
                    fromPubkey: jitoTipWallet.publicKey,
                    toPubkey: jitoTipAccount,
                    lamports: jitoTipLamports,
                });

                const buyTX = await staggerTX(mint, bondingCurve, aBondingCurve, owner, buyAmountLamports, slippage);

                const staggerIX = new TransactionMessage({
                    payerKey: owner,
                    instructions: [buyTX, tipTx],
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash
                }).compileToV0Message([]);

                const vTX = new VersionedTransaction(staggerIX);
                vTX.sign([jitoTipWallet, walletSK]);
            
                const bund = new Bundle([], 5);
                bund.addTransactions(vTX);

                const simulation = await connection.simulateTransaction(vTX);
                if (simulation.value.err) {
                    console.log(chalk.red("Simulation failed"));
                    console.log(JSON.stringify(simulation.value));
                    continue;
                } else {
                    console.log(chalk.green("Simulation passed."));
                }
                
                try {
                    const sendJitoBundle = await sendBundle(bund, blockEngineURL);
                    console.log(`Confirm Bundle Manually (JITO): https://explorer.jito.wtf/bundle/${sendJitoBundle}`);
                } catch (error) {
                    if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                        console.log("Bundle Landed!");
                    } else {
                        console.error("Error sending bundle:", error);
                    }
                }
            } else {
                const buyTX = await staggerTX(mint, bondingCurve, aBondingCurve, owner, buyAmountLamports, slippage);

                let computePriceIx = (ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnit }));
                let computeLimitIx = (ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }));

                let mV0 = new TransactionMessage({
                    payerKey: owner,
                    instructions: [computePriceIx, computeLimitIx, buyTX],
                    recentBlockhash: (await connection.getLatestBlockhash()).blockhash
                }).compileToV0Message([]);

                let vTX = new VersionedTransaction(mV0);

                vTX.sign([walletSK]);

                const simulation = await connection.simulateTransaction(vTX);
                if (simulation.value.err) {
                    console.log(chalk.red("Simulation failed", simulation.value.err));
                    console.log(JSON.stringify(simulation.value.logs, null, 2));
                    continue;
                } else {
                    console.log(chalk.green("Simulation passed."));
                }
                
                const sendTX = await connection.sendTransaction(vTX, {
                    skipPreflight: true,
                    preflightCommitment: 'confirmed',
                    maxRetries: 3
                });

                console.log(chalk.green(`Buy TX sent: https://solscan.io/tx/${sendTX}`));
            }

            // Delay between buys
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    console.log(chalk.green(`Stagger buy completed. Total buy volume: ${totalBuyVolume.toFixed(4)} SOL`));
}
export default staggerBuy;