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


}
export default unWrap;