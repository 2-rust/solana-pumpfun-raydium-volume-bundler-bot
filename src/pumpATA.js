import { PublicKey, Keypair } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import fs from 'fs';

async function createATA(mint, wallet) {
    try {
        const pubkey = wallet.pubKey;
        const owner = new PublicKey(pubkey);

        const mintToken = new PublicKey(mint);

        // Get the associated token address
        const associatedToken = getAssociatedTokenAddressSync(mintToken, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
        const ata = associatedToken.toBase58();
        const ataIX = createAssociatedTokenAccountIdempotentInstruction(owner, associatedToken, owner, mintToken, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

        return { ata, ataIX };
    } catch (error) {
        const logFilePath = "./logs.txt";
        const errorMessage = `Error occurred: ${error.message || error}\n`;
        fs.appendFileSync(logFilePath, errorMessage);
        console.log("An error occurred, check logs.txt for more information.");
        throw error; // Rethrow the error after logging it
    }
}

export default createATA;
