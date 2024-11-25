import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

async function genWallet(amount) {
    // Create directories if they don't exist
    if (!fs.existsSync('./keypairs')) {
        fs.mkdirSync('./keypairs');
    }

    if (!fs.existsSync('./keypairBackup')) {
        fs.mkdirSync('./keypairBackup');
    }

    if (!fs.existsSync('./walletBackup')) {
        fs.mkdirSync('./walletBackup');
    }

    // Clear wallets.txt
    fs.writeFileSync('./wallets.txt', '');

    for (let i = 0; i < amount; i++) {
        const keyPair = Keypair.generate();

        // Write to wallets.txt
        const walletData = `${keyPair.publicKey.toString()}:${bs58.encode(keyPair.secretKey)}`;
        if (i < amount - 1) {
            fs.appendFileSync('./wallets.txt', `${walletData}\n`);
        } else {
            fs.appendFileSync('./wallets.txt', `${walletData}`);
        }

        // Save to keypairs directory
        fs.writeFileSync(`./keypairs/keypair${i + 1}.json`, JSON.stringify(Array.from(keyPair.secretKey)));

        const date = new Date();
        // Store date as string formatted as MM-DD-HH-MM
        const kpDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
        fs.writeFileSync(`./keypairBackup/keypair${i + 1}-${kpDate}.json`, JSON.stringify(Array.from(keyPair.secretKey)));
    }

    // Backup wallets.txt
    const date = new Date();
    const backupDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    const walletBackupPath = `./walletBackup/wallets-${backupDate}.txt`;
    fs.copyFileSync('./wallets.txt', walletBackupPath);

    console.log('All wallets generated successfully.');
    console.log(`Backup of wallets.txt created at ${walletBackupPath}`);
}

export default genWallet;

