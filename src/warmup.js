import { PublicKey, Keypair, Connection, VersionedTransaction, TransactionMessage, ComputeBudgetProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { warmupTX } from './createTX.js';
import GPA from './pumpDecode.js';
import { warmupSellTX } from './createSellTX.js';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import chalk from 'chalk';
import axios from 'axios';


async function parseRandomCoins() {
    const url = "https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=true";

    const response = await axios.get(url);
    const list = response.data;

    let coinList = [];
    for (const coin of list) {
        let mint = coin.mint;
        let bCurve = coin.bonding_curve;
        let abCurve = coin.associated_bonding_curve;
        let symbol = coin.symbol;
        coinList.push({ mint, bCurve, abCurve, symbol });
    }
    return coinList;
}

async function confirmTransaction(connection, signature, timeout = 29000) {
    const start = Date.now();
    let done = false;
    while (Date.now() - start < timeout && !done) {
        const signatureStatuses = await connection.getSignatureStatuses([signature]);
        const status = signatureStatuses && signatureStatuses.value[0];
        if (status) {
            if (status.err) {
                throw new Error(`Transaction ${signature} failed`);
            } else if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
                done = true;
            }
        }
        if (!done) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    if (!done) {
        console.log(`Transaction ${signature} timed out`);
        return false;
    }
    return true;
}

let warmupBuyData = [];

async function warmupBuy() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const minBuy = config.minBuy;
    const maxBuy = config.maxBuy;

    let slippagePct = config.slippagePct;
    slippagePct = parseFloat(slippagePct);

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const PUMP = new PublicKey(PUMP_PUBLIC_KEY);
    
    const wallets = await loadWallets();
    const coins = await parseRandomCoins();
    const usedCoins = new Set();

    // loop thru each wallet, buy a random coin and then store this data in an array to be used for selling
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const coin = coins[Math.floor(Math.random() * coins.length)];
        if (usedCoins.has(coin)) {
            i--;
            continue;
        }
        usedCoins.add(coin);
        const mint = new PublicKey(coin.mint);
        const bCurve = new PublicKey(coin.bCurve);
        const aBCurve = new PublicKey(coin.abCurve);
        const symbol = coin.symbol;

        const owner = new PublicKey(wallet.pubKey);
        const walletBalance = await connection.getBalance(owner);
        const walletBalanceSol = walletBalance / 1e9; // Convert lamports to SOL
        if (walletBalanceSol <= 0.0001) {
            console.log(chalk.red("Wallet SOL balance too low, skipping."));
            continue;
        }

        let buyAmount = Math.random() * (maxBuy - minBuy) + minBuy;
        buyAmount = parseFloat(buyAmount.toFixed(4));
        let buyAmountLamports = buyAmount * 1e9; // Convert SOL to lamports

        console.log(chalk.blue(`Buying ${(buyAmount).toFixed(4)} SOL on ${symbol}: ${coin.mint} with ${wallet.pubKey}`));

        const buyTX = await warmupTX(mint, bCurve, aBCurve, PUMP, wallet, buyAmountLamports);

        // send the transaction
        const signature = await connection.sendTransaction(buyTX, {
            skipPreflight: true,
            preflightCommitment: 'confirmed'
        });

        console.log(chalk.yellow(`Sent Buy TX: https://solscan.io/tx/${signature}`));

        // confirm the TX
        const isConfirmed = await confirmTransaction(connection, signature);

        if (isConfirmed) {
            console.log(chalk.green(`Bought ${symbol} on ${wallet.pubKey}\n`));
            let data = {
                wallet: wallet.pubKey,
                mint: coin.mint,
                bCurve: coin.bCurve,
                abCurve: coin.abCurve,
                symbol: coin.symbol
            }
            warmupBuyData.push(data);
        }
    }
}

async function warmupSell() {
    console.log("\n")
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const PUMP = new PublicKey(PUMP_PUBLIC_KEY);

    const wallets = await loadWallets();

    // loop thru each wallet, sell the coin they've bought
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];

        // Load the buy data
        const buyData = warmupBuyData.find((data) => data.wallet === wallet.pubKey);

        if (!buyData) {
            console.log(chalk.red(`No buy data found for wallet: ${wallet.pubKey}`));
            return;
        }

        console.log(chalk.yellow(`Selling ${buyData.symbol} on wallet ${wallet.pubKey}`));

        const ca = new PublicKey(buyData.mint);
        const bCurve = new PublicKey(buyData.bCurve);
        const aBCurve = new PublicKey(buyData.abCurve);

        const owner = new PublicKey(wallet.pubKey);
        const walletBalance = await connection.getBalance(owner);
        const walletBalanceSol = walletBalance / 1e9; // Convert lamports to SOL

        if (walletBalanceSol <= 0.0001) {
            console.log(chalk.red("Wallet SOL balance too low, skipping."));
            continue;
        }

        // Get token accounts for wallet
        const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: ca });
        if (tokenAccount.value.length === 0) {
            console.log(chalk.red(`No token accounts found for wallet: ${wallet.pubKey}`));
            return;
        }

        const tokenAccountPubKey = tokenAccount.value[0].pubkey.toBase58();

        const sellAmountResponse = await connection.getTokenAccountBalance(new PublicKey(tokenAccountPubKey));
        const sellAmountLamports = parseInt(sellAmountResponse.value.amount);
        const sellAmount = sellAmountResponse.value.uiAmount;

        if (sellAmount && sellAmount <= 1) {
            console.log(chalk.red(`Token balance too low for wallet ${index + 1}, skipping.`));
            return;
        }

        const sellTX = await warmupSellTX(ca, bCurve, aBCurve, PUMP, wallet, sellAmountLamports, tokenAccountPubKey);

        // send the transaction
        const signature = await connection.sendTransaction(sellTX, {
            skipPreflight: true,
            preflightCommitment: 'confirmed'
        });

        // confirm the TX
        const isConfirmed = await confirmTransaction(connection, signature);

        if (isConfirmed) {
            console.log(chalk.green(`Sold ${ca.toBase58()} on wallet ${wallet.pubKey} with signature ${signature}`));
        }
    }
}

async function warmupWallets(loops, delay) {
    for (let i = 0; i < loops; i++) {
        console.log(chalk.green(`Warmup Buy ${i + 1}/${loops}`));
        await warmupBuy();

        await new Promise(resolve => setTimeout(resolve, delay));
        console.clear();

        console.log(chalk.green(`Warmup Sell ${i + 1}/${loops}`));
        await warmupSell();

        if (i < loops - 1) {
            await new Promise(resolve => setTimeout(resolve, 7000));
        }
    }
}

export default warmupWallets;