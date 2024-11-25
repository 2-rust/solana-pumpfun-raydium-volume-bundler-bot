import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import { createSameTX } from './createTX.js';
import { createSellTX } from './createSellTX.js';

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

async function buyAndSell(ca, buyAmt, delay, rl) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    let computeUnit = config.computeUnit;
    let computeLimit = config.computeLimit;

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
    const wallet = wallets[0]; // Use the first wallet

    let running = true;

    console.log("Starting buy and sell loop. Press 'x' and enter to exit.");

    rl.on('line', (input) => {
        if (input.toLowerCase() === 'x') {
            running = false;
            console.log("Exiting loop...");
        }
    });

    while (running) {
        try {
            const owner = new PublicKey(wallet.pubKey);
            const walletBalance = await connection.getBalance(owner);
            const walletBalanceSol = walletBalance / 1e9;

            if (walletBalanceSol < 0.01) {
                console.log(chalk.yellow("Wallet SOL balance too low (< 0.01 SOL), exiting."));
                break;
            }

            let buyAmount = parseFloat(buyAmt);

            if (buyAmount >= walletBalanceSol) {
                console.log(chalk.red("Wallet SOL balance too low, recalculating amount to buy."));
                buyAmount = walletBalanceSol * 0.75;
                buyAmount = parseFloat(buyAmount.toFixed(4));
                console.log("New Buy Amount: ", buyAmount);
                if (buyAmount < 0.01) {
                    console.log(chalk.yellow("Buy amount too low, exiting."));
                    break;
                }
            }

            const buyAmountLamports = Math.round(buyAmount * 1e9);

            const mint = new PublicKey(ca);
            const bondingCurve = new PublicKey(bCurve);
            const aBondingCurve = new PublicKey(aCurve);
            const pump = new PublicKey(PUMP_PUBLIC_KEY);

            // Create the buy transaction
            let buyTransaction = await createSameTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, computeLimit, computeUnit);
            let buyTxInstructions = buyTransaction.instructions;
            let sellAmount = buyTransaction.amt;

            const ata = getAssociatedTokenAddressSync(mint, owner, true);
            const tokenAccountPubKey = ata.toBase58();

            // Create the sell transaction
            let sellAmountLamports = Math.floor(sellAmount);
            let sellTransaction = await createSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey);
            let sellTxInstructions = sellTransaction.instructions;

            // Combine buy and sell instructions
            const txInstructions = [...buyTxInstructions, ...sellTxInstructions];

            const blockhashObj = await connection.getLatestBlockhash('finalized');
            const recentBlockhash = blockhashObj.blockhash;

            const messageV0 = new TransactionMessage({
                payerKey: buyTransaction.payer.publicKey,
                instructions: txInstructions,
                recentBlockhash: recentBlockhash
            }).compileToV0Message([]);

            const fullTX = new VersionedTransaction(messageV0);
            fullTX.sign([buyTransaction.payer]);

            const sentTx = await connection.sendTransaction(fullTX, {
                skipPreflight: true,
                commitment: 'confirmed'
            });
            console.log("Transaction sent:", sentTx);

            // Add a small delay to avoid spamming the network
            await new Promise(resolve => setTimeout(resolve, delay));

            // Check if we should exit the loop
            if (!running) break;

        } catch (e) {
            console.error("Error in buy and sell loop:", e);
            // Add a delay before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

export default buyAndSell;