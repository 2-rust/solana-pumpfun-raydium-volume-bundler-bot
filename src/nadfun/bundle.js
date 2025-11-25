import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * Execute multiple transactions in sequence with proper nonce management
 * This replaces JITO bundling for EVM chains
 * @param {Array<Object>} transactions - Array of {wallet, function, params, description}
 * @param {Object} options - Options for bundling
 * @returns {Promise<Array>} Array of transaction hashes
 */
export async function executeBundle(transactions, options = {}) {
    const {
        delayBetweenTxs = 100, // Delay between transactions in ms
        waitForConfirmation = false,
        maxRetries = 3
    } = options;
    
    const results = [];
    const errors = [];
    
    // Sort transactions by wallet address to manage nonces properly
    const transactionsByWallet = {};
    for (const tx of transactions) {
        const address = tx.wallet.address.toLowerCase();
        if (!transactionsByWallet[address]) {
            transactionsByWallet[address] = [];
        }
        transactionsByWallet[address].push(tx);
    }
    
    // Process transactions for each wallet sequentially
    for (const [walletAddress, walletTxs] of Object.entries(transactionsByWallet)) {
        let nonce = await walletTxs[0].wallet.provider.getTransactionCount(walletTxs[0].wallet.address, 'pending');
        
        for (const tx of walletTxs) {
            let retries = 0;
            let success = false;
            
            while (retries < maxRetries && !success) {
                try {
                    // Prepare transaction with correct nonce
                    const txParams = {
                        ...tx.params,
                        nonce: nonce
                    };
                    
                    // Execute transaction
                    const txResponse = await tx.function(...tx.params, txParams);
                    const txHash = typeof txResponse === 'string' ? txResponse : txResponse.hash;
                    
                    results.push({
                        hash: txHash,
                        wallet: tx.wallet.address,
                        description: tx.description || 'Transaction'
                    });
                    
                    if (tx.description) {
                        console.log(chalk.green(`✓ ${tx.description}: ${txHash}`));
                    }
                    
                    // Wait for confirmation if requested
                    if (waitForConfirmation && typeof txResponse === 'object' && txResponse.wait) {
                        await txResponse.wait();
                    }
                    
                    // Increment nonce for next transaction
                    nonce++;
                    success = true;
                    
                    // Delay between transactions
                    if (delayBetweenTxs > 0) {
                        await new Promise(resolve => setTimeout(resolve, delayBetweenTxs));
                    }
                    
                } catch (error) {
                    retries++;
                    if (retries >= maxRetries) {
                        errors.push({
                            wallet: tx.wallet.address,
                            description: tx.description || 'Transaction',
                            error: error.message
                        });
                        console.error(chalk.red(`✗ Failed after ${maxRetries} retries: ${tx.description || 'Transaction'}`));
                        console.error(chalk.red(`  Error: ${error.message}`));
                    } else {
                        console.warn(chalk.yellow(`⚠ Retry ${retries}/${maxRetries} for: ${tx.description || 'Transaction'}`));
                        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
                    }
                }
            }
        }
    }
    
    return {
        successful: results,
        errors: errors,
        successCount: results.length,
        errorCount: errors.length
    };
}

/**
 * Execute transactions in parallel batches
 * @param {Array<Object>} transactions - Array of transaction objects
 * @param {number} batchSize - Number of transactions per batch
 * @param {Object} options - Options for bundling
 * @returns {Promise<Object>} Bundle results
 */
export async function executeBundleParallel(transactions, batchSize = 5, options = {}) {
    const {
        delayBetweenBatches = 500,
        waitForConfirmation = false
    } = options;
    
    const results = [];
    const errors = [];
    
    // Process in batches
    for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        
        console.log(chalk.blue(`Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} transactions)...`));
        
        // Execute batch in parallel
        const batchPromises = batch.map(async (tx) => {
            try {
                const txResponse = await tx.function(...tx.params, tx.params);
                const txHash = typeof txResponse === 'string' ? txResponse : txResponse.hash;
                
                if (waitForConfirmation && typeof txResponse === 'object' && txResponse.wait) {
                    await txResponse.wait();
                }
                
                return {
                    success: true,
                    hash: txHash,
                    wallet: tx.wallet.address,
                    description: tx.description || 'Transaction'
                };
            } catch (error) {
                return {
                    success: false,
                    wallet: tx.wallet.address,
                    description: tx.description || 'Transaction',
                    error: error.message
                };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
            if (result.success) {
                results.push(result);
                if (result.description) {
                    console.log(chalk.green(`✓ ${result.description}: ${result.hash}`));
                }
            } else {
                errors.push(result);
                console.error(chalk.red(`✗ ${result.description}: ${result.error}`));
            }
        });
        
        // Delay between batches
        if (i + batchSize < transactions.length && delayBetweenBatches > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }
    
    return {
        successful: results,
        errors: errors,
        successCount: results.length,
        errorCount: errors.length
    };
}
