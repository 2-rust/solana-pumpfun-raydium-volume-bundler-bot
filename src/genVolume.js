import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import sendBundle from './sendBundle.js';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import chalk from 'chalk';
import { createHumanTX } from './createTX.js';
import { humanSellTX } from './createSellTX.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';



// Load the configuration
const config = await loadConfig();
const rpc = config.rpcURL;
const ws = config.wsURL;
const minBuy = config.minBuy;
const maxBuy = config.maxBuy;
const useJITO = config.useJITO;
const tipPayer = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jitoTip)));
const jitoTipAmount = parseFloat(config.jitoTipAmount) * 1e9; 
const blockEngineURL = config.blockEngineURL;


async function autoVolume(ca, bCurve, aCurve, minDelay, maxDelay, sellPct) {
    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const pump = new PublicKey(PUMP_PUBLIC_KEY);

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const wallets = await loadWallets();
    let buyWallets = [];
    let sellWallets = [];

    // load and map buy amounts from the JSON file
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
            buyAmount = parseFloat(buyAmount.toFixed(3)); // Round to 4 decimal places
        }

        return { wallet, buyAmount };
    });

    while (true) {
        while (sellWallets.length < wallets.length) {
            // Buy for two wallets before selling one
            for (let i = 0; i < 2; i++) {
                const walletIndex = buyWallets.length % wallets.length; // Wrap around if needed
                const { wallet, buyAmount } = walletBuyAmounts[walletIndex];
                if (!buyWallets.includes(wallet)) {
                    await buy(connection, wallet, ca, bCurve, aCurve, pump, buyAmount, minDelay, maxDelay, useJITO);
                    buyWallets.push(wallet);
                }
            }

            // Sell one wallet
            const sellIndex = sellWallets.length % wallets.length; // Wrap around if needed
            const sellWallet = wallets[sellIndex];
            if (!sellWallets.includes(sellWallet)) {
                await sell(connection, sellWallet, ca, bCurve, aCurve, pump, minDelay, maxDelay, sellPct, useJITO);
                sellWallets.push(sellWallet);
            }
        }

        // Reset buy and sell wallets for the next iteration
        buyWallets = [];
        sellWallets = [];
    }
}
async function buy(connection, wallet, ca, bCurve, aCurve, pump, buyAmount, minDelay, maxDelay, useJITO) {
    const owner = new PublicKey(wallet.pubKey);
    const walletBalance = await connection.getBalance(owner);
    const walletBalanceSol = walletBalance / 1e9; // Convert lamports to SOL

    if (walletBalanceSol <= 0) {
        console.log(chalk.red("Wallet SOL balance too low, skipping."));
        return;
    }

    if (buyAmount >= walletBalanceSol) {
        console.log(chalk.red("Wallet SOL balance too low, recalculating amount to buy."));
        // set the buy amount to 75% of the wallet balance
        buyAmount = walletBalanceSol * 0.75;
        buyAmount = parseFloat(buyAmount.toFixed(4));
        console.log("New Buy Amount: ", buyAmount);
    }
    const buyAmountLamports = Math.floor(buyAmount * 1e9);

    const mint = new PublicKey(ca);
    const bondingCurve = new PublicKey(bCurve);
    const aBondingCurve = new PublicKey(aCurve);

    const fullTX = await createHumanTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports);

    if (useJITO) {
        const blockhashObj = await connection.getLatestBlockhash();
        const recentBlockhash = blockhashObj.blockhash;
        const jitoTipAccounts = ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49', 'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'];

        let pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
        let jitoTipAccount = jitoTipAccounts[pickAccount];

        const tipAccount = new PublicKey(jitoTipAccount);
        const bund = new Bundle([]);
        bund.addTransactions(fullTX);
        bund.addTipTx(tipPayer, jitoTipAmount, tipAccount, recentBlockhash);

        try {
            const sentBundle = await sendBundle(bund, blockEngineURL);
            console.log(chalk.green(`Sent bundle: https://explorer.jito.wtf/bundle/${sentBundle}`));
        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log("Bundle Landed!");
                return;
            }
            console.error("Error sending bundle:", error);
        }
    } else {

        const sentTx = await connection.sendTransaction(fullTX, {
            skipPreflight: true,
            commitment: 'confirmed'
        });
        console.log("Buy Transaction sent:", sentTx);
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    console.log(chalk.yellow(`Waiting ${delay / 1000}s to continue...`));

    await new Promise(r => setTimeout(r, delay));
}

async function sell(connection, wallet, ca, bCurve, aCurve, pump, minDelay, maxDelay, sellPct, useJITO) {
    const owner = new PublicKey(wallet.pubKey);
    const walletBalance = await connection.getBalance(owner);
    if (walletBalance <= 0) {
        console.log(chalk.red("Wallet SOL balance too low, skipping."));
        return;
    }
    const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: new PublicKey(ca) });

    if (tokenAccount.value.length === 0) {
        console.log(chalk.red("Token balance too low (empty), skipping.\n"));
        return;
    }
    const tokenAccountPubKey = tokenAccount.value[0].pubkey.toBase58();

    let sellAmount = await connection.getTokenAccountBalance(new PublicKey(tokenAccountPubKey));

    let sellAmountLamports = sellAmount.value.amount;
    if (sellPct && sellPct < 100) {
        sellAmountLamports = Math.floor(sellAmountLamports * (sellPct / 100));
    }
    sellAmount = sellAmount.value.uiAmount;

    if (sellAmount <= 0) {
        console.log(chalk.red("Token balance too low (empty), skipping.\n"));
        return;
    }

    const mint = new PublicKey(ca);
    const bondingCurve = new PublicKey(bCurve);
    const aBondingCurve = new PublicKey(aCurve);

    const fullTXSell = await humanSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey);

    if (useJITO) {
        const blockhashObj = await connection.getLatestBlockhash();
        const recentBlockhash = blockhashObj.blockhash;
        const jitoTipAccounts = ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49', 'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'];

        let pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
        let jitoTipAccount = jitoTipAccounts[pickAccount];

        const tipAccount = new PublicKey(jitoTipAccount);
        const bund = new Bundle([]);
        bund.addTransactions(fullTXSell);
        bund.addTipTx(tipPayer, jitoTipAmount, tipAccount, recentBlockhash);

        try {
            const sentBundle = await sendBundle(bund, blockEngineURL);
            console.log(chalk.green(`Sent bundle: https://explorer.jito.wtf/bundle/${sentBundle}`));
        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log("Bundle Landed!");
                return;
            }
            console.error("Error sending bundle:", error);
        }
    } else {
        const sentTx = await connection.sendTransaction(fullTXSell, {
            skipPreflight: true,
            commitment: 'confirmed'
        });
        console.log("Sell Transaction sent:", sentTx);
    }

    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    console.log(chalk.yellow(`Waiting ${delay / 1000}s to continue...`));

    await new Promise(r => setTimeout(r, delay));
}

export default autoVolume;