import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { buyToken } from './nadfun/buy.js';
import { sellToken, getTokenBalance } from './nadfun/sell.js';
import { parseMon } from './nadfun/constants.js';

/**
 * Human Mode - Buy, Buy, Sell cycle for all wallets
 * Similar to the original humanMode.js but for nad.fun
 */
export default async function humanMode(tokenAddress, minDelaySeconds, maxDelaySeconds, sellPercentage) {
    const config = await loadConfig();
    const wallets = await loadWallets();
    
    if (wallets.length === 0) {
        console.error(chalk.red('No wallets found! Please generate wallets first.'));
        return;
    }
    
    const provider = new ethers.JsonRpcProvider(config.rpcURL);
    
    console.log(chalk.blue(`\nStarting Human Mode for token ${tokenAddress}`));
    console.log(chalk.blue(`Min delay: ${minDelaySeconds}s, Max delay: ${maxDelaySeconds}s`));
    console.log(chalk.blue(`Sell percentage: ${sellPercentage}%\n`));
    
    const results = [];
    
    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i].wallet.connect(provider);
        
        console.log(chalk.cyan(`\nProcessing wallet ${i + 1}/${wallets.length}: ${wallet.address}`));
        
        try {
            // First buy
            const buyAmount1 = (Math.random() * (parseFloat(config.maxBuy) - parseFloat(config.minBuy)) + parseFloat(config.minBuy)).toFixed(6);
            const buyAmount1Wei = parseMon(buyAmount1);
            
            console.log(chalk.yellow(`  Buy 1: ${buyAmount1} MON...`));
            const tx1 = await buyToken(wallet, tokenAddress, buyAmount1Wei, parseFloat(config.slippage) * 100);
            console.log(chalk.green(`  ✓ Buy 1: ${tx1}`));
            
            // Random delay
            const delay1 = Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1)) + minDelaySeconds;
            console.log(chalk.blue(`  Waiting ${delay1}s...`));
            await new Promise(resolve => setTimeout(resolve, delay1 * 1000));
            
            // Second buy
            const buyAmount2 = (Math.random() * (parseFloat(config.maxBuy) - parseFloat(config.minBuy)) + parseFloat(config.minBuy)).toFixed(6);
            const buyAmount2Wei = parseMon(buyAmount2);
            
            console.log(chalk.yellow(`  Buy 2: ${buyAmount2} MON...`));
            const tx2 = await buyToken(wallet, tokenAddress, buyAmount2Wei, parseFloat(config.slippage) * 100);
            console.log(chalk.green(`  ✓ Buy 2: ${tx2}`));
            
            // Random delay
            const delay2 = Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1)) + minDelaySeconds;
            console.log(chalk.blue(`  Waiting ${delay2}s...`));
            await new Promise(resolve => setTimeout(resolve, delay2 * 1000));
            
            // Sell
            const balance = await getTokenBalance(provider, tokenAddress, wallet.address);
            if (balance.raw > 0n) {
                const sellAmount = (balance.raw * BigInt(Math.floor(sellPercentage * 100))) / 10000n;
                
                if (sellAmount > 0n) {
                    console.log(chalk.yellow(`  Sell: ${sellPercentage}% of ${balance.formatted} tokens...`));
                    const tx3 = await sellToken(wallet, tokenAddress, sellAmount, parseFloat(config.slippage) * 100);
                    console.log(chalk.green(`  ✓ Sell: ${tx3}`));
                    
                    results.push({
                        wallet: wallet.address,
                        success: true,
                        buys: [tx1, tx2],
                        sell: tx3
                    });
                } else {
                    console.log(chalk.yellow(`  Skipping sell (amount too small)`));
                    results.push({
                        wallet: wallet.address,
                        success: true,
                        buys: [tx1, tx2],
                        sell: null
                    });
                }
            } else {
                console.log(chalk.yellow(`  No tokens to sell`));
                results.push({
                    wallet: wallet.address,
                    success: true,
                    buys: [tx1, tx2],
                    sell: null
                });
            }
            
        } catch (error) {
            console.error(chalk.red(`  ✗ Error: ${error.message}`));
            results.push({
                wallet: wallet.address,
                success: false,
                error: error.message
            });
        }
        
        // Delay between wallets
        if (i < wallets.length - 1) {
            const walletDelay = Math.floor(Math.random() * (maxDelaySeconds - minDelaySeconds + 1)) + minDelaySeconds;
            await new Promise(resolve => setTimeout(resolve, walletDelay * 1000));
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(chalk.green(`\n✓ Completed ${successCount}/${wallets.length} wallets\n`));
    
    return results;
}

function delay(minDelay, maxDelay) {
    const delayTime = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    return new Promise(resolve => setTimeout(resolve, delayTime * 1000));
}
