import { Connection, PublicKey,  TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8.js";
import GPA from './pumpDecode.js';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import bs58 from 'bs58';
import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import { createTX, createTXWithTip } from './createTX.js';
import sendBundle from './sendBundle.js';
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

async function buyThePumpJito(ca, delay) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const minBuy = config.minBuy;
    const maxBuy = config.maxBuy;
    const blockEngineURL = config.blockEngineURL;
    let slippage = config.slippage;
   

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

    const reserveData = await GPA(bCurve);

    const logFilePath = "./reserves.JSON";
    const reserveDataString = JSON.stringify(reserveData);
    fs.writeFileSync(logFilePath, reserveDataString);

    const wallets = await loadWallets();
    const batchSize = 10;
    const loops = Math.ceil(wallets.length / batchSize);

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
        const start = i * batchSize;
        const end = start + batchSize;
        const batchWallets = walletBuyAmounts.slice(start, end);

        const transactions = [];
        const signers = [];

        for (let j = 0; j < batchWallets.length; j += 2) {
            let txInstructions = [];
            let currentSigners = [];

            for (let k = 0; k < 2 && (j + k) < batchWallets.length; k++) {
                const { wallet, buyAmount } = batchWallets[j + k];
                const owner = new PublicKey(wallet.pubKey);
                const walletBalance = await connection.getBalance(owner);
                const walletBalanceSol = walletBalance / 1e9; // Convert lamports to SOL

                if (walletBalanceSol < 0.01) {
                    console.log(chalk.yellow("Wallet SOL balance too low (< 0.01 SOL), skipping."));
                    continue;
                }

                if (buyAmount >= walletBalanceSol) {
                    console.log(chalk.red("Wallet SOL balance too low, recalculating amount to buy."));
                    buyAmount = walletBalanceSol * 0.75;
                    buyAmount = parseFloat(buyAmount.toFixed(4));
                    console.log("New Buy Amount: ", buyAmount);
                    if (buyAmount < 0.01) {
                        console.log(chalk.yellow("Skipping as buy won't show up on P.F."));
                        continue;
                    }
                }

                const buyAmountLamports = Math.round(buyAmount * 1e9);
                totalBuyVolume += parseFloat(buyAmount);

                const mint = new PublicKey(ca);
                const bondingCurve = new PublicKey(bCurve);
                const aBondingCurve = new PublicKey(aCurve);
                const pump = new PublicKey(PUMP_PUBLIC_KEY);

                console.log(`Wallet: ${wallet.pubKey} - Buy Amount: ${buyAmount} SOL`);

                let transaction;
                if (j + k === batchWallets.length - 1) {
                    transaction = await createTXWithTip(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, slippage);
                } else {
                    transaction = await createTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, slippage);
                }

                txInstructions.push(...transaction.instructions);
                currentSigners.push(transaction.payer);
            }

            if (txInstructions.length > 0) {
                const blockhashObj = await connection.getLatestBlockhash('finalized');
                const recentBlockhash = blockhashObj.blockhash;

                const messageV0 = new TransactionMessage({
                    payerKey: currentSigners[0].publicKey,
                    instructions: txInstructions,
                    recentBlockhash: recentBlockhash
                }).compileToV0Message();

                const fullTX = new VersionedTransaction(messageV0);
                fullTX.sign(currentSigners);
                transactions.push(fullTX);
                signers.push(...currentSigners);
            }
        }

        // simulate sending the bundle
        const simulate = await connection.simulateTransaction(transactions[0]);
        if (simulate.err) {
            console.log(chalk.red("Simulation failed: ", simulate));
            return;
        } else {
            console.log(chalk.green("Simulation successful"));
        }

        const bund = new Bundle([], 5);

        for (const tx of transactions) {
            bund.addTransactions(tx);
        }
        console.log("Number of transactions in the bundle:", bund.transactions.length);

        try {
            const sentBundle = await sendBundle(bund, blockEngineURL);
            console.log(`Confirm Bundle Manually (JITO): https://explorer.jito.wtf/bundle/${sentBundle}`);
            console.log("Processing times may be slow...\n");
        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log("Bundle Landed!");
                return;
            }
            console.error("Error sending bundle:", error);
        }
        slippage += 0.05;
        await new Promise(r => setTimeout(r, delay));
    }

    console.log(chalk.green("Total Buy Volume: ", totalBuyVolume.toFixed(4)));
    const solPrice = await getSOLPrice();
    const totalBuyVolumeUSD = totalBuyVolume * solPrice;
    console.log(chalk.green("Total Buy Volume USD: ", totalBuyVolumeUSD.toFixed(2)));
}

async function getSOLPrice() {
    const url = "https://frontend-api.pump.fun/sol-price";

    const response = await axios.get(url,
        {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive'
            }
        }
    );

    if (response.status !== 200) {
        console.log(`Error: ${response.status}`);
        return;
    } else {
        let solPrice = response.data.solPrice;
        return solPrice;
    }

}
export default buyThePumpJito;