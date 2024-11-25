import {
    Connection,
    PublicKey,
    Keypair,
    TransactionMessage,
    VersionedTransaction,
} from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import sendBundle from '../sendBundle.js';
import loadConfig from '../loadConfig.js';
import loadWallets from '../loadWallets.js';
import { getKeypairFromBs58 } from './sell.js';
import chalk from 'chalk';

async function unWrapIX(connection) {
    const wallets = await loadWallets();

    let wSOLIX = [];

    for (const wallet of wallets) {
        const owner = new PublicKey(wallet.pubKey);
        const wSolATA = await spl.getAssociatedTokenAddress(spl.NATIVE_MINT, owner);

        if (!wSolATA) {
            console.error(chalk.red.bold('Failed to get wSOL account'));
            continue;
        }

        // Check balance of wSOL account
        try {
            const balance = await connection.getTokenAccountBalance(wSolATA);
            if (balance.value.uiAmount === 0) {
                console.log(chalk.yellow(`Skipping wallet ${wallet.pubKey} - No wrapped SOL balance`));
                continue;
            }
        } catch (error) {
            continue;
        }

        const unwrap = spl.createCloseAccountInstruction(
            wSolATA,
            owner,
            owner
        );

        wSOLIX.push({ instruction: unwrap, wallet: getKeypairFromBs58(wallet.privKey) });
    }

    console.log("created " + wSOLIX.length + " unwrap instructions");

    return wSOLIX;
}

async function unWrap() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const signer = getKeypairFromBs58(config.jitoTip);
    const jitoTipAmount = parseFloat(config.jitoTipAmount);
    const jitoTipLamports = Math.floor(jitoTipAmount * 1e9);
    const blockEngineURL = config.blockEngineURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    // Load the instructions
    const instructionsWithWallets = await unWrapIX(connection);

    // Process instructions and create Versioned Transactions
    const transactions = [];
    for (let i = 0; i < instructionsWithWallets.length; i += 4) {  // Changed from 6 to 4
        const batch = instructionsWithWallets.slice(i, i + 4);  // Changed from 6 to 4
        const instructions = batch.map(iw => iw.instruction);
        const wallets = batch.map(iw => iw.wallet);

        const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const message = new TransactionMessage({
            payerKey: signer.publicKey,
            instructions: instructions,
            recentBlockhash: recentBlockhash,
        }).compileToV0Message([]);

        const tx = new VersionedTransaction(message);

        // Sign the transaction with the signer and the respective wallets
        tx.sign([signer, ...wallets]);
        transactions.push(tx);
    }

    // Add transactions to a bundle
    const bund = new Bundle([], 5);

    for (const tx of transactions) {
        try {
            const { value: simulationResult } = await connection.simulateTransaction(tx);
            if (simulationResult.err) {
                console.log(chalk.yellow('Simulation failed, skipping this transaction.'));
                continue;
            } else {
                console.log(chalk.green.bold('Simulation passed, adding TX to bundle.'));
                bund.addTransactions(tx);
                if (bund.transactions.length >= 4) {
                    break;  // Stop adding transactions if we reach 4
                }
            }
        } catch (error) {
            console.error(chalk.red(`Error simulating transaction: ${error.message}`));
        }
    }

    const jitoAccount = new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5");
    const bh = (await connection.getLatestBlockhash()).blockhash;

    // Add a tip to the bundle
    bund.addTipTx(signer, jitoTipLamports, jitoAccount, bh);
    console.log("Added tip to bundle");

    console.log("Bundle created with " + bund.transactions.length + " transactions.");

    if (bund.transactions.length <= 1) {
        console.log(chalk.red("Bundle contains 1 or fewer transactions, exiting."));
        return;
    }

    // Send the bundle
    try {
        let sentBundle = await sendBundle(bund, blockEngineURL);
        console.log(`Sent Bundle: https://explorer.jito.wtf/bundle/${sentBundle}`);
    } catch (error) {
        const typedError = error;
        if (typedError.message.includes("bundle contains an already processed transaction")) {
            console.log("Bundle already processed, skipping.");
        } else {
            console.error(chalk.red(`Error sending bundle: ${error.message}`));
            return;
        }
    }
}
export default unWrap;