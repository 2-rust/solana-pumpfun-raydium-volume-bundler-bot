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
}

export default singleSell;
