import {
    Connection,
    PublicKey,
    Keypair,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction,
    SystemProgram
} from '@solana/web3.js';

import * as SPL from '@solana/spl-token';

import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";

import bs58 from "bs58";
import inquirer from 'inquirer';
import { Parser } from './parser.js';
import loadConfig from '../loadConfig.js';
import poolKeys from './poolKeys.js';
import getMarket from './getMID.js';
import loadWallets from '../loadWallets.js';
import createwSOL from './createWSOL.js';
import chalk from 'chalk';

export function getKeypairFromBs58(bs58String) {
    try {
        const privateKeyObject = bs58.decode(bs58String);
        const privateKey = Uint8Array.from(privateKeyObject);
        return Keypair.fromSecretKey(privateKey);
    } catch (e) {
        console.error("Error creating keypair:", e + bs58String);
        throw e; // It's better to throw the error and let the caller handle it
    }
}

async function getTokenActBal(wallet, token) {
    const config = await loadConfig();
    const connection = new Connection(config.rpcURL, 'confirmed');
    const owner = new PublicKey(wallet.pubKey);

    try {
        const tokenAccounts = await connection.getTokenAccountsByOwner(owner, { mint: token });

        if (tokenAccounts.value.length === 0) {
            // No token account found for this wallet and token
            return '0';
        }

        const tokenAccountPubKey = tokenAccounts.value[0].pubkey;
        const tokenAccountBalance = await connection.getTokenAccountBalance(tokenAccountPubKey);
        return tokenAccountBalance.value.amount || '0';
    } catch (error) {
        console.error(`Error fetching balance for wallet ${wallet.pubKey}:`, error);
        return 'Error';
    }
}

async function chooseWallet(token) {
    const wallets = await loadWallets();
    const mint = new PublicKey(token);

    const walletOptions = await Promise.all(wallets.map(async (wallet, index) => {
        const balance = await getTokenActBal(wallet, mint);
        return {
            name: `${index}: ${wallet.pubKey} - ${(balance / 1e6).toFixed(2)}`,
            value: { index, ...wallet }
        };
    }));

    const questions = [
        {
            type: 'list',
            name: 'wallet',
            message: 'Choose a wallet (pubKey - token balance):',
            choices: walletOptions
        }
    ];

    return inquirer.prompt(questions).then(answers => answers.wallet);
}


async function raySell(mint, percent) {
    const config = await loadConfig();
    const connection = new Connection(config.rpcURL, 'confirmed');
    const jitoTip = getKeypairFromBs58(config.jitoTip);
    const blockEngineURL = config.blockEngineURL;
    const jitoTipLamports = parseFloat(config.jitoTipAmount) * 1e9

    const wallet = await chooseWallet(mint);

    const owner = new PublicKey(wallet.pubKey);
    const payer = getKeypairFromBs58(wallet.privKey);
    const wSolAccount = await SPL.getAssociatedTokenAddress(SPL.NATIVE_MINT, owner);

    const wSOLInstruction = await createwSOL(owner);

    const marketData = await getMarket(mint);
    const marketID = new PublicKey(marketData.marketID);


    const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    const Amm_Authority = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');
    const openbookProgram = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX');

    const lpInfo = await poolKeys(marketID);
    const poolID = lpInfo.poolID;
    const openOrders = lpInfo.openOrders;
    const targetOrders = lpInfo.targetOrders;
    const baseVault = lpInfo.baseVault;
    const quoteVault = lpInfo.quoteVault;
    const marketAuthority = Amm_Authority;
    const mrktBaseVault = lpInfo.mrktBaseVault;
    const mrktQuoteVault = lpInfo.mrktQuoteVault;
    const mrktBids = lpInfo.mrktBids;
    const mrktAsks = lpInfo.mrktAsks;
    const mrktEventQueue = lpInfo.mrktEventQueue;

    // Get token account
    const tokenAccountPubKey = await connection.getTokenAccountsByOwner(owner, { mint: new PublicKey(mint) }).then(data => data.value[0].pubkey);

    // Get the amount to sell
    const tokenAccountBalance = await connection.getTokenAccountBalance(tokenAccountPubKey);
    let sellAmount = tokenAccountBalance.value.amount;
    if (percent < 100) {
        sellAmount = Math.floor(sellAmount * percent / 100);
        console.log(chalk.blue(`Selling ${percent}% of ${mint} from ${wallet.pubKey}`));
    }

    // Buffer Data
    const INST_LAYOUT = new Parser()
        .u8("cmd")
        .u64("amount_in")
        .u64("min_out_amount");
    const buffer = INST_LAYOUT.encode({
        cmd: 9,
        amount_in: sellAmount,
        min_out_amount: 0
    });

    // Raydium TX
    const sellIX = new TransactionInstruction({
        programId: rayV4,
        keys: [
            { pubkey: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), isSigner: false, isWritable: false }, // 1. Token Program ID
            { pubkey: poolID, isSigner: false, isWritable: true }, // 2. AMM ID
            { pubkey: Amm_Authority, isSigner: false, isWritable: false }, // 3. AMM Authority
            { pubkey: openOrders, isSigner: false, isWritable: true }, // 4. Amm Open Orders
            { pubkey: targetOrders, isSigner: false, isWritable: true }, // 5. Amm Target Orders / AMM Quantities
            { pubkey: baseVault, isSigner: false, isWritable: true }, // 6. Pool Coin Token Account
            { pubkey: quoteVault, isSigner: false, isWritable: true }, // 7. Pool PC Token Account
            { pubkey: openbookProgram, isSigner: false, isWritable: false }, // 8. Openbook SerumProgramId
            { pubkey: marketID, isSigner: false, isWritable: true }, // 9. Serum Market
            { pubkey: mrktBids, isSigner: false, isWritable: true }, // 10. MarketBids
            { pubkey: mrktAsks, isSigner: false, isWritable: true }, // 11. MarketAsks
            { pubkey: mrktEventQueue, isSigner: false, isWritable: true }, // 12. SerumEventQueue
            { pubkey: mrktBaseVault, isSigner: false, isWritable: true }, // 13. SerumCoinVaultAccount
            { pubkey: mrktQuoteVault, isSigner: false, isWritable: true }, // 14. SerumPcVaultAccount
            { pubkey: marketAuthority, isSigner: false, isWritable: false }, // 15. SerumVaultSigner
            { pubkey: tokenAccountPubKey, isSigner: false, isWritable: true }, // 16. User ATA Account
            { pubkey: wSolAccount, isSigner: false, isWritable: true }, // 17. User wSOL Account
            { pubkey: owner, isSigner: true, isWritable: true } // 18. User Wallet  
        ],
        data: buffer
    });
    
    // JITO
    const search = searcherClient(blockEngineURL);

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

    let pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
    let jitoTipAccount = jitoTipAccounts[pickAccount];

    const tipAccount = new PublicKey(jitoTipAccount);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    const tipIX = SystemProgram.transfer({
        fromPubkey: jitoTip.publicKey,
        toPubkey: tipAccount,
        lamports: jitoTipLamports
    });

    const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        instructions: [wSOLInstruction, sellIX, tipIX],
        recentBlockhash: recentBlockhash
    }).compileToV0Message([]);

    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer, jitoTip]);

    console.log(fullTX.serialize().length);

    const bund = new Bundle([]);
    const finalBundle = bund.addTransactions(fullTX);

    const sentBundle = await search.sendBundle(finalBundle)
    console.log("Bundle sent", `https://explorer.jito.wtf/bundle/${sentBundle}`);
}

export default raySell;
