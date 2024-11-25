import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { createSellTXWithTip } from './createSellTX.js';
import bs58 from 'bs58';
import { getBondingCurve } from './getKeys.js';
import chalk from 'chalk';
import sendBundle from './sendBundle.js';

async function delaySell(ca, delay) {
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

    for (let i = 0; i < wallets.length; i++) {
        const walletToUse = wallets[i];

        console.log(chalk.green(`Processing wallet ${i + 1}/${wallets.length}: ${walletToUse.pubKey}`));

        try {
            const owner = new PublicKey(walletToUse.pubKey);
            let walletBalance = await connection.getBalance(owner);

            if (walletBalance <= 0) {
                console.log(chalk.red(`Wallet SOL balance too low for ${walletToUse.pubKey}, skipping.`));
                continue;
            }

            const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: new PublicKey(ca) });

            if (tokenAccount.value.length === 0) {
                console.log(chalk.red(`No token account found for ${ca} in wallet ${walletToUse.pubKey}, skipping.`));
                continue;
            }

            const tokenAccountPubKey = tokenAccount.value[0].pubkey.toBase58();

            let sellAmount = await connection.getTokenAccountBalance(new PublicKey(tokenAccountPubKey));
            let sellAmountLamports = sellAmount.value.amount;
            sellAmount = sellAmount.value.uiAmount;

            if (sellAmount <= 0) {
                console.log(chalk.red(`Token balance too low (empty) for ${walletToUse.pubKey}, skipping.`));
                continue;
            }

            console.log(chalk.blue(`Selling ${sellAmount} tokens from wallet ${walletToUse.pubKey}`));

            const mint = new PublicKey(ca);
            const bondingCurve = new PublicKey(bCurve);
            const aBondingCurve = new PublicKey(aCurve);

            const sellIX = await createSellTXWithTip(mint, bondingCurve, aBondingCurve, pump, walletToUse, sellAmountLamports, tokenAccountPubKey);

            const messageV0 = new TransactionMessage({
                payerKey: sellIX.payer.publicKey,
                instructions: sellIX.instructions,
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash
            }).compileToV0Message([]);

            const fullTX = new VersionedTransaction(messageV0);
            fullTX.sign([sellIX.payer]);

            const bund = new Bundle([]);
            bund.addTransactions(fullTX);

            const sentBundle = await sendBundle(bund, blockEngineURL);
            console.log(chalk.green(`Bundle sent for wallet ${walletToUse.pubKey}. Confirm Bundle Manually (JITO): https://explorer.jito.wtf/bundle/${sentBundle}`));
            console.log("Processing times may be slow...\n");

        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log(chalk.yellow(`Bundle for wallet ${walletToUse.pubKey} already processed!`));
            } else {
                console.error(chalk.red(`Error processing wallet ${walletToUse.pubKey}:`, error.message));
            }
        }

        // set a delay between sells
        console.log(chalk.cyan(`Waiting for ${delay}ms before processing the next wallet...`));
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    console.log(chalk.green("Finished processing all wallets."));
}

export default delaySell;