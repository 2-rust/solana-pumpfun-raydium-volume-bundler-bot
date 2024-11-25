import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { createSellTX, createSellTXWithTip } from './createSellTX.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import { getBondingCurve } from './getKeys.js';
import sendBundle from './sendBundle.js';

process.removeAllListeners('warning');
process.removeAllListeners('ExperimentalWarning');


async function sellTheDump(ca, pct) {
    const config = await loadConfig();

    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const blockEngineURL = config.blockEngineURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const pump = new PublicKey(PUMP_PUBLIC_KEY);
    const pumpProgramId = new PublicKey(PUMP_PUBLIC_KEY);
    const mintPubKey = new PublicKey(ca);

    const bondingCurvePda = getBondingCurve(mintPubKey, pumpProgramId);
    const bondingCurveAta = getAssociatedTokenAddressSync(mintPubKey, bondingCurvePda, true);

    const bCurve = bs58.encode(bondingCurvePda.toBuffer());
    const aCurve = bs58.encode(bondingCurveAta.toBuffer());

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
            console.log(chalk.green(`Processing wallet ${j+1}: ${wallet.pubKey}`));
            const owner = new PublicKey(wallet.pubKey);
            let walletBalance = await connection.getBalance(owner);

            if (walletBalance < 0) {
                console.log(chalk.red("Wallet SOL balance too low, skipping."));
                continue;
            }

            const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: new PublicKey(ca) });

            if (tokenAccount.value.length === 0) {
                console.log(chalk.red("Token balance too low (empty), skipping.\n"));
                continue;
            }

            const tokenAccountPubKey = tokenAccount.value[0].pubkey.toBase58();
            console.log(chalk.green(`Token Account: ${tokenAccountPubKey}\n`));

            let sellAmount = await connection.getTokenAccountBalance(new PublicKey(tokenAccountPubKey));
            let sellAmountLamports = sellAmount.value.amount;
            sellAmount = sellAmount.value.uiAmount;

            // if user enters percent
            if (pct !== undefined && pct !== null) {
                let percentToSell = Number(pct);
                if (!isNaN(percentToSell)) {
                    // if pct is entered as a decimal, multiply by 100
                    if (percentToSell > 0 && percentToSell < 1) {
                        percentToSell *= 100;
                    }

                    // check if pct is valid 
                    if (percentToSell > 0 && percentToSell <= 100) {
                        sellAmount = sellAmount * percentToSell / 100;
                        sellAmountLamports = Math.floor(sellAmount * 1e6);
                        console.log(chalk.blue(`Selling ${percentToSell}% of tokens: ${sellAmount} tokens (${sellAmountLamports} lamports)`));
                    } else {
                        console.log(chalk.red(`Invalid percentage. Using 100% instead.`));
                    }
                } else {
                    console.log(chalk.red(`Invalid percentage input. Using 100% instead.`));
                }
            }

            if (sellAmount <= 0) {
                console.log(chalk.red("Token balance too low (empty), skipping.\n"));
                continue;
            }

            validWallets.push({ wallet, sellAmount, sellAmountLamports, tokenAccountPubKey });
        }

        if (validWallets.length === 0) {
            console.log(chalk.yellow("No transactions to process in this batch, skipping bundle creation."));
            continue;
        }

        for (let j = 0; j < validWallets.length; j += 2) {
            let txInstructions = [];
            let currentSigners = [];

            for (let k = 0; k < 2 && (j + k) < validWallets.length; k++) {
                const { wallet, sellAmount, sellAmountLamports, tokenAccountPubKey } = validWallets[j + k];

                const mint = new PublicKey(ca);
                const bondingCurve = new PublicKey(bCurve);
                const aBondingCurve = new PublicKey(aCurve);

                let tx;
                if (j + k === validWallets.length - 1) {
                    tx = await createSellTXWithTip(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey);
                } else {
                    tx = await createSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey);
                }

                txInstructions.push(...tx.instructions);
                currentSigners.push(tx.payer);
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

        // simulate sending the TXs
        const simulate = await connection.simulateTransaction(transactions[0]);
        if (simulate.err) {
            console.log(chalk.red("Error simulating transaction: ", simulate));
            return;
        } else {
            console.log(chalk.green("Simulation successful"));
        }

        const bund = new Bundle([]);
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
    }

}
export default sellTheDump;