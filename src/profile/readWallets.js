import { readFile } from 'fs/promises';
import { join } from 'path';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

// Function to load wallets from wallets.txt and create wallet objects
async function loadWallets() {
    const walletsFilePath = join(process.cwd(), 'wallets.txt');
    const data = await readFile(walletsFilePath, 'utf-8');

    const wallets = [];

    const lines = data.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
        const [pubKey, privKey] = line.split(':');
        if (pubKey && privKey) {
            const keypair = Keypair.fromSecretKey(bs58.decode(privKey.trim()));

            const wallet = {
                pubKey: pubKey.trim(),
                privKey: privKey.trim(),
                keypair
            };

            wallets.push(wallet);
        }
    }
    return wallets;
}
export default loadWallets;
