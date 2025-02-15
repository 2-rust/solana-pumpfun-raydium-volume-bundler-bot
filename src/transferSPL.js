import { PublicKey, Keypair, Connection, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import sendBundle from './sendBundle.js';
import createATA from './pumpATA.js';

import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';

import bs58 from 'bs58';
import chalk from 'chalk';

async function sendSPL(ca, sendTo) {

}
export default sendSPL;