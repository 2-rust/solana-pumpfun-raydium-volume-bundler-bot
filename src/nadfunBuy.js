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
