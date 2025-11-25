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
