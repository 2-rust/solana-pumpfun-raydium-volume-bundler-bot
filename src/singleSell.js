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

async function singleSell(ca, rl) {
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

    // loop thru the wallets, get the ATA and token balance of each wallet
    let walletsWithBalances = [];
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const owner = new PublicKey(wallet.pubKey);
        let walletBalance = await connection.getBalance(owner);

        if (walletBalance < 0) {
            console.log(chalk.red(`Wallet ${i + 1}: SOL balance too low, skipping.`));
            continue;
        }

        const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: mintPubKey });

        if (tokenAccount.value.length === 0) {
            console.log(chalk.red(`Wallet ${i + 1}: Token account not found, skipping.`));
            continue;
        }

        const tokenAccountPubKey = tokenAccount.value[0].pubkey;

        let sellAmount = await connection.getTokenAccountBalance(tokenAccountPubKey);
        sellAmount = sellAmount.value.uiAmount;

        if (sellAmount <= 0) {
            console.log(chalk.red(`Wallet ${i + 1}: Token balance too low (empty), skipping.`));
            continue;
        }

        walletsWithBalances.push({
            index: i + 1,
            address: wallet.pubKey,
            balance: sellAmount
        });
    }

    console.log("\nWallets with balances:");
    console.table(walletsWithBalances.map(wallet => ({
        Index: wallet.index,
        Address: wallet.address,
        Balance: wallet.balance
    })));

    function promptUser(promptText) {
        return new Promise((resolve) => {
            rl.question(promptText, resolve);
        });
    }

    async function selectWallet() {
        const userInput = await promptUser('Enter the index of the wallet you want to use: ');
        const walletIndex = parseInt(userInput, 10);

        if (isNaN(walletIndex) || walletIndex < 0 || walletIndex >= wallets.length) {
            console.log('Invalid index. Please try again.');
            return selectWallet();
        }

        const selectedWallet = wallets[walletIndex];
        console.log(`You selected wallet ${walletIndex} with public key: ${selectedWallet.pubKey}`);

        const owner = new PublicKey(selectedWallet.pubKey);
        let walletBalance = await connection.getBalance(owner);

        if (walletBalance < 0) {
            console.log(chalk.red("Wallet SOL balance too low, skipping."));
            return selectWallet();
        }

        const tokenAccount = await connection.getTokenAccountsByOwner(owner, { mint: new PublicKey(ca) });

        if (tokenAccount.value.length === 0) {
            console.log(chalk.red("Token balance too low (empty), skipping.\n"));
            return selectWallet();
        }

        const tokenAccountPubKey = tokenAccount.value[0].pubkey.toBase58();

        let sellAmount = await connection.getTokenAccountBalance(new PublicKey(tokenAccountPubKey));
        let sellAmountLamports = sellAmount.value.amount;
        sellAmount = sellAmount.value.uiAmount;

        if (sellAmount <= 0) {
            console.log(chalk.red("Token balance too low (empty), skipping.\n"));
            return selectWallet();
        }

        const mint = new PublicKey(ca);
        const bondingCurve = new PublicKey(bCurve);
        const aBondingCurve = new PublicKey(aCurve);

        const sellIX = await createSellTXWithTip(mint, bondingCurve, aBondingCurve, pump, selectedWallet, sellAmountLamports, tokenAccountPubKey);

        const messageV0 = new TransactionMessage({
            payerKey: sellIX.payer.publicKey,
            instructions: sellIX.instructions,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash
        }).compileToV0Message([]);

        const fullTX = new VersionedTransaction(messageV0);
        fullTX.sign([sellIX.payer]);

        const bund = new Bundle([]);
        bund.addTransactions(fullTX);

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

    await selectWallet();
}

export default singleSell;
