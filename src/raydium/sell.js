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
}

export default raySell;
