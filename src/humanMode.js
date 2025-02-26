import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import sendBundle from './sendBundle.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import chalk from 'chalk';
import { createHumanTX } from './createTX.js';
import { humanSellTX } from './createSellTX.js';
import bs58 from 'bs58';
import { getBondingCurve } from './getKeys.js';
import fs from 'fs';
import path from 'path';

const config = await loadConfig();
const rpc = config.rpcURL;
const ws = config.wsURL;
const minBuy = config.minBuy;
const maxBuy = config.maxBuy;
const useJITO = config.useJITO;
const tipPayer = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jitoTip)));
const jitoTipAmount = parseFloat(config.jitoTipAmount) * 1e9;
const blockEngineURL = config.blockEngineURL;

async function humanMode(ca, minDelaySeconds, maxDelaySeconds, sellPct) {
    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });


}

async function delay(minDelay, maxDelay) {
    const delayTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    console.log(chalk.yellow(`Waiting ${(delayTime / 1000).toFixed(2)}s to continue...`));
    await new Promise(r => setTimeout(r, delayTime));
}

async function buy(connection, wallet, ca, bCurve, aCurve, pump, buyAmount, minDelay, maxDelay, useJITO) {
    
}

async function sell(connection, wallet, ca, bCurve, aCurve, pump, minDelay, maxDelay, sellPct) {
    
}

export default humanMode;
