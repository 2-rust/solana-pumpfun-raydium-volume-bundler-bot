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





async function autoVolume(ca, bCurve, aCurve, minDelay, maxDelay, sellPct) {

}
async function buy(connection, wallet, ca, bCurve, aCurve, pump, buyAmount, minDelay, maxDelay, useJITO) {
    
}

async function sell(connection, wallet, ca, bCurve, aCurve, pump, minDelay, maxDelay, sellPct, useJITO) {
    
}

export default autoVolume;
