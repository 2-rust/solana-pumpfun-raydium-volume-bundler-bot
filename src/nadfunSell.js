import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { sellToken, getTokenBalance, getSellQuote } from './nadfun/sell.js';
import { executeBundle } from './nadfun/bundle.js';

/**
 * Bundle sell transactions for nad.fun tokens
 * Similar to the original pumpSell.js but for EVM
 */
export default async function nadfunSell(tokenAddress, sellPercentage = 100) {
    const config = await loadConfig();
    const wallets = await loadWallets();
    
    if (wallets.length === 0) {
        console.error(chalk.red('No wallets found! Please generate wallets first.'));
        return;
    }
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(config.rpcURL);
    
    console.log(chalk.blue(`Preparing to sell ${sellPercentage}% of tokens from ${wallets.length} wallets...`));
    
    // Prepare transactions
    const transactions = [];
    
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i].wallet.connect(provider);
        
        try {
            // Get token balance
            const balance = await getTokenBalance(provider, tokenAddress, wallet.address);
            
            if (balance.raw === 0n) {
                console.log(chalk.yellow(`Wallet ${i + 1} has no tokens to sell`));
                continue;
            }
            
            // Calculate sell amount based on percentage
            const sellAmountRaw = (balance.raw * BigInt(Math.floor(sellPercentage * 100))) / 10000n;
            
            if (sellAmountRaw === 0n) {
                console.log(chalk.yellow(`Wallet ${i + 1} calculated sell amount is 0`));
                continue;
            }
            
            // Get current nonce
            const currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
            
            transactions.push({
                wallet: wallet,
                function: sellToken,
                params: [
                    wallet,
                    tokenAddress,
                    sellAmountRaw,
                    parseFloat(config.slippage) * 100, // Convert to percentage
                    {
                        nonce: currentNonce
                    }
                ],
                description: `Wallet ${i + 1} sell ${balance.formatted} tokens (${sellPercentage}%)`
            });
            
        } catch (error) {
            console.warn(chalk.yellow(`Skipping wallet ${i + 1}: ${error.message}`));
            continue;
        }
    }
    
    if (transactions.length === 0) {
        console.error(chalk.red('No wallets have tokens to sell!'));
        return;
    }
    
    console.log(chalk.blue(`\nPrepared ${transactions.length} sell transactions\n`));
    
    // Execute bundle
    const results = await executeBundle(transactions, {
        delayBetweenTxs: config.delay || 5000,
        waitForConfirmation: false,
        maxRetries: 3
    });
    
    // Print results
    console.log(chalk.green(`\n✓ Successfully executed ${results.successCount} transactions`));
    if (results.errorCount > 0) {
        console.log(chalk.red(`✗ Failed: ${results.errorCount} transactions`));
    }
    
    return results;
}
