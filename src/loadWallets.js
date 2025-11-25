import { readFile } from 'fs/promises';
import { join } from 'path';
import { ethers } from 'ethers';

// Function to load wallets from wallets.txt and create wallet objects for EVM
async function loadWallets() {
    const walletsFilePath = join(process.cwd(), 'wallets.txt');
    
    try {
        const data = await readFile(walletsFilePath, 'utf-8');
        const wallets = [];

        const lines = data.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            const [pubKey, privKey] = line.split(':');
            if (pubKey && privKey) {
                // Remove 0x prefix if present
                const privateKey = privKey.trim().startsWith('0x') 
                    ? privKey.trim() 
                    : '0x' + privKey.trim();
                
                try {
                    const wallet = new ethers.Wallet(privateKey);
                    
                    wallets.push({
                        address: wallet.address,
                        privateKey: privateKey,
                        wallet: wallet
                    });
                } catch (error) {
                    console.error(`Error creating wallet from private key: ${error.message}`);
                }
            }
        }
        return wallets;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('wallets.txt file not found. Please generate wallets first.');
            return [];
        }
        throw error;
    }
}

export default loadWallets;
