import { Connection, PublicKey, Keypair, } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import GPA from './pumpDecode.js';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import bs58 from 'bs58';
import fs from 'fs';
import { createMicroTX } from './createTX.js';
import { getBondingCurve } from './getKeys.js';

async function microBuySpam(ca, delay) {
    const config = await loadConfig();

    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
    const pumpProgramId = new PublicKey(PUMP_PUBLIC_KEY);
    const mintPubKey = new PublicKey(ca);

    const bondingCurvePda = getBondingCurve(mintPubKey, pumpProgramId);
    const bondingCurveAta = getAssociatedTokenAddressSync(mintPubKey, bondingCurvePda, true);

    const bCurve = bs58.encode(bondingCurvePda.toBuffer());
    const aCurve = bs58.encode(bondingCurveAta.toBuffer());

    const reserveData = await GPA(bCurve);

    // log this to JSON file
    const logFilePath = "./reserves.JSON";
    const reserveDataString = JSON.stringify(reserveData);
    fs.writeFileSync(logFilePath, reserveDataString);

    const wallets = await loadWallets();

    let slippage = 0.15;

    let loop = true;

    while (loop) {
        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            const walletKey = Keypair.fromSecretKey(bs58.decode(wallet.privKey));
            
            let buyAmount = config.microBuyAmount;
            buyAmount = parseFloat(buyAmount);

            const buyAmountLamports = (buyAmount * 1e9);

            const mint = new PublicKey(ca);
            const bondingCurve = new PublicKey(bCurve);
            const aBondingCurve = new PublicKey(aCurve);
            const pump = new PublicKey(PUMP_PUBLIC_KEY);

            const tx = await createMicroTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, slippage);

            const rawTX = tx.serialize();

            const signature = await connection.sendRawTransaction(rawTX, {
                skipPreflight: true,
                commitment: 'confirmed',
                maxRetries: 5,
            });

            console.log(`Transaction Sent: https://solscan.io/tx/${signature}`);

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
export default microBuySpam;