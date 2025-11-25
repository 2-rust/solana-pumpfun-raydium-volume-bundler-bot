import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { sellToken, getTokenBalance } from './nadfun/sell.js';

/**
 * Single wallet sell - Sell tokens from a specific wallet
 */
export default async function singleSell(tokenAddress, rl) {
    
    
    // Prompt for wallet selection
    return new Promise((resolve) => {
        rl.question(chalk.yellow('Select wallet number to sell from: '), async (answer) => {
            const walletIndex = parseInt(answer) - 1;
            
            if (walletIndex < 0 || walletIndex >= wallets.length) {
                console.error(chalk.red('Invalid wallet selection!'));
                resolve(null);
                return;
            }
            
            const selectedWallet = wallets[walletIndex];
            const wallet = selectedWallet.wallet.connect(provider);
            
            try {
                const balance = await getTokenBalance(provider, tokenAddress, wallet.address);
                
                if (balance.raw === 0n) {
                    console.error(chalk.red('Selected wallet has no tokens!'));
                    resolve(null);
                    return;
                }
                
                console.log(chalk.blue(`\nSelling all tokens from wallet ${walletIndex + 1}...`));
                console.log(chalk.blue(`Balance: ${balance.formatted} tokens\n`));
                
                // Sell all tokens
                const txHash = await sellToken(wallet, tokenAddress, null, parseFloat(config.slippage) * 100);
                
                console.log(chalk.green(`✓ Sell transaction: ${txHash}`));
                resolve(txHash);
                
            } catch (error) {
                console.error(chalk.red(`Error selling tokens: ${error.message}`));
                resolve(null);
            }
        });
    });
}
