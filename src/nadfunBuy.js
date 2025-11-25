import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { buyToken, getBuyQuote, isTokenListed } from './nadfun/buy.js';
import { executeBundle } from './nadfun/bundle.js';
import { parseMon, formatMon } from './nadfun/constants.js';

/**
 * Bundle buy transactions for nad.fun tokens
 * Similar to the original jitoBuy.js but for EVM
 */
export default async function nadfunBuy(tokenAddress, delayMs = 5000) {
    const config = await loadConfig();
    const wallets = await loadWallets();
    
    if (wallets.length === 0) {
        console.error(chalk.red('No wallets found! Please generate wallets first.'));
        return;
    }
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(config.rpcURL);
    
    // Check if token is listed
    console.log(chalk.blue(`Checking if token ${tokenAddress} is listed...`));
    const isListed = await isTokenListed(provider, tokenAddress);
    
    if (!isListed) {
        console.error(chalk.red(`Token ${tokenAddress} is not listed on nad.fun bonding curve!`));
        return;
    }
    
    console.log(chalk.green(`Token is listed! Generating volume with ${wallets.length} wallets...`));
    
    // Limit bundle size (default: unlimited, can be configured)
    const maxWalletsPerBundle = config.maxWalletsPerBundle || wallets.length;
    const walletsToUse = wallets.slice(0, maxWalletsPerBundle);
    
    if (wallets.length > maxWalletsPerBundle) {
        console.log(chalk.yellow(`Limiting bundle to ${maxWalletsPerBundle} wallets (you have ${wallets.length} total)`));
    }
    
    // Prepare transactions
    const transactions = [];
    let nonceOffset = 0;
    
    for (let i = 0; i < walletsToUse.length; i++) {
        const wallet = walletsToUse[i].wallet.connect(provider);
        
        // Get current nonce for this wallet
        const currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
        
        // Random buy amount between minBuy and maxBuy
        const buyAmount = (Math.random() * (parseFloat(config.maxBuy) - parseFloat(config.minBuy)) + parseFloat(config.minBuy)).toFixed(6);
        const buyAmountWei = parseMon(buyAmount);
        
        // Get quote to verify we can buy
        try {
            const quote = await getBuyQuote(provider, tokenAddress, buyAmountWei);
            
            transactions.push({
                wallet: wallet,
                function: buyToken,
                params: [
                    wallet,
                    tokenAddress,
                    buyAmountWei,
                    parseFloat(config.slippage) * 100, // Convert 0.05 to 5%
                    {
                        nonce: currentNonce + nonceOffset
                    }
                ],
                description: `Wallet ${i + 1} buy ${buyAmount} MON`
            });
            
        } catch (error) {
            console.warn(chalk.yellow(`Skipping wallet ${i + 1}: ${error.message}`));
            continue;
        }
        
        // Stagger nonces if needed
        if ((i + 1) % 10 === 0) {
            nonceOffset++;
        }
    }
    
    if (transactions.length === 0) {
        console.error(chalk.red('No valid transactions to execute!'));
        return;
    }
    
    console.log(chalk.blue(`\nPrepared ${transactions.length} buy transactions`));
    console.log(chalk.yellow(`Delay between transactions: ${delayMs}ms\n`));
    
    // Execute bundle
    const results = await executeBundle(transactions, {
        delayBetweenTxs: delayMs,
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
