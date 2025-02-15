import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8.js";
import GPA from './pumpDecode.js';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import bs58 from 'bs58';
import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import { createTX, createTXWithTip } from './createTX.js';
import sendBundle from './sendBundle.js';
import path from 'path';

process.removeAllListeners('warning');
process.removeAllListeners('ExperimentalWarning');

function getBondingCurve(mint, programId,) {
    const [pda, _] = PublicKey.findProgramAddressSync(
        [
            encode("bonding-curve"),
            mint.toBuffer(),
        ],
        programId,
    )
    return pda
}

async function buyThePumpJito(ca, delay) {
}

async function getSOLPrice() {
    const url = "https://frontend-api.pump.fun/sol-price";

    const response = await axios.get(url,
        {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive'
            }
        }
    );

    if (response.status !== 200) {
        console.log(`Error: ${response.status}`);
        return;
    } else {
        let solPrice = response.data.solPrice;
        return solPrice;
    }

}
export default buyThePumpJito;