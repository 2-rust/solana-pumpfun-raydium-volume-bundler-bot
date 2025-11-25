import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { formatMon, parseMon } from './nadfun/constants.js';

/**
 * Distribute MON from main wallet to all sub-wallets
 */
export default async function distro(amountPerWallet = null) {
    const config = await loadConfig();
    const wallets = await loadWallets();
    
    if (!config.sender) {
        console.error(chalk.red('Sender private key not configured in config.json!'));
        return;
    }
    
    if (wallets.length === 0) {
        console.error(chalk.red('No wallets found! Please generate wallets first.'));
        return;
    }
    
    const provider = new ethers.JsonRpcProvider(config.rpcURL);
    const senderWallet = new ethers.Wallet(config.sender, provider);
    
    // Check sender balance
    const senderBalance = await provider.getBalance(senderWallet.address);
    console.log(chalk.blue(`Sender balance: ${formatMon(senderBalance)} MON`));
    
    // Calculate amount per wallet if not specified
    if (!amountPerWallet) {
        // Leave some MON in sender wallet for gas
        const reserveAmount = parseMon("0.1");
        const availableAmount = senderBalance > reserveAmount ? senderBalance - reserveAmount : 0n;
        amountPerWallet = availableAmount / BigInt(wallets.length);
    } else {
        amountPerWallet = typeof amountPerWallet === 'string' ? parseMon(amountPerWallet) : amountPerWallet;
    }
    
    console.log(chalk.blue(`Distributing ${formatMon(amountPerWallet)} MON to ${wallets.length} wallets...\n`));
    
    const results = [];
    let nonce = await provider.getTransactionCount(senderWallet.address, 'pending');
    
    for (let i = 0; i < wallets.length; i++) {
        try {
            const tx = await senderWallet.sendTransaction({
                to: wallets[i].address,
                value: amountPerWallet,
                nonce: nonce++,
                gasLimit: 21000
            });
            
            results.push({
                success: true,
                wallet: wallets[i].address,
                txHash: tx.hash
            });
            
            console.log(chalk.green(`✓ Sent to wallet ${i + 1}: ${tx.hash}`));
            
            // Small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            results.push({
                success: false,
                wallet: wallets[i].address,
                error: error.message
            });
            console.error(chalk.red(`✗ Failed to send to wallet ${i + 1}: ${error.message}`));
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(chalk.green(`\n✓ Successfully distributed to ${successCount}/${wallets.length} wallets`));
    
    return results;
}

/**
 * Refund MON from sub-wallets back to main wallet
 */
export async function refund() {
    const config = await loadConfig();
    const wallets = await loadWallets();
    
    if (!config.sender) {
        console.error(chalk.red('Sender private key not configured in config.json!'));
        return;
    }
    
    if (wallets.length === 0) {
        console.error(chalk.red('No wallets found! Please generate wallets first.'));
        return;
    }
    
    const provider = new ethers.JsonRpcProvider(config.rpcURL);
    const receiverAddress = new ethers.Wallet(config.sender, provider).address;
    
    // Reserve amount to keep in each wallet for gas
    const reserveAmount = parseMon("0.0009");
    
    console.log(chalk.blue(`Refunding MON from ${wallets.length} wallets to ${receiverAddress}...\n`));
    
    const results = [];
    
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i].wallet.connect(provider);
        
        try {
            const balance = await provider.getBalance(wallet.address);
            
            if (balance <= reserveAmount) {
                console.log(chalk.yellow(`Wallet ${i + 1} has insufficient balance (${formatMon(balance)} MON)`));
                continue;
            }
            
            const refundAmount = balance - reserveAmount - parseMon("0.0001"); // Leave a bit more for gas
            
            const tx = await wallet.sendTransaction({
                to: receiverAddress,
                value: refundAmount,
                gasLimit: 21000
            });
            
            results.push({
                success: true,
                wallet: wallet.address,
                txHash: tx.hash,
                amount: refundAmount
            });
            
            console.log(chalk.green(`✓ Refunded ${formatMon(refundAmount)} MON from wallet ${i + 1}: ${tx.hash}`));
            
            // Small delay between transactions
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            results.push({
                success: false,
                wallet: wallets[i].address,
                error: error.message
            });
            console.error(chalk.red(`✗ Failed to refund from wallet ${i + 1}: ${error.message}`));
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalRefunded = results.filter(r => r.success).reduce((sum, r) => sum + (r.amount || 0n), 0n);
    
    console.log(chalk.green(`\n✓ Successfully refunded ${formatMon(totalRefunded)} MON from ${successCount}/${wallets.length} wallets`));
    
    return results;
}
