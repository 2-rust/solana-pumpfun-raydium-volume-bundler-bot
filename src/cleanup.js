import { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types.js";
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { createSellTX } from './createSellTX.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import GPA from './pumpDecode.js';
import { getBondingCurve } from './getKeys.js';
import sendBundle from './sendBundle.js';
import fetchTokens from './fetchTokens.js';

async function cleanup() {
    
}

async function createTipIX() {
    
}

export default cleanup;
