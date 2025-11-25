import { ethers } from 'ethers';
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
        // Generate new EVM wallet
        const wallet = ethers.Wallet.createRandom();
        const address = wallet.address;
        const privateKey = wallet.privateKey;

        // Write to wallets.txt (format: address:privateKey)
        const walletData = `${address}:${privateKey}`;
        if (i < amount - 1) {
            fs.appendFileSync('./wallets.txt', `${walletData}\n`);
        } else {
            fs.appendFileSync('./wallets.txt', `${walletData}`);
        }

        // Save to keypairs directory as JSON (store private key securely)
        const keypairData = {
            address: address,
            privateKey: privateKey
        };
        fs.writeFileSync(`./keypairs/keypair${i + 1}.json`, JSON.stringify(keypairData, null, 2));

        const date = new Date();
        // Store date as string formatted as MM-DD-HH-MM
        const kpDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
        fs.writeFileSync(`./keypairBackup/keypair${i + 1}-${kpDate}.json`, JSON.stringify(keypairData, null, 2));
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