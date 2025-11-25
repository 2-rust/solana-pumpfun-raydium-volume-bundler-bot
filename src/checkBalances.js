import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { ERC20_ABI } from './nadfun/abis.js';
import { formatMon } from './nadfun/constants.js';

/**
 * Check MON and token balances for all wallets
 */
export default async function checkBalances(tokenAddress = null) {
    const config = await loadConfig();
    const wallets = await loadWallets();
    
    if (wallets.length === 0) {
        console.error(chalk.red('No wallets found! Please generate wallets first.'));
        return;
    }
    
    const provider = new ethers.JsonRpcProvider(config.rpcURL);
    
    console.log(chalk.blue(`\nChecking balances for ${wallets.length} wallets...\n`));
    console.log(chalk.yellow('='.repeat(80)));
    
    let totalMON = 0n;
    let totalTokens = 0n;
    let tokenDecimals = 18;
    let tokenSymbol = 'TOKEN';
    
    // Get token info if token address provided
    if (tokenAddress) {
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            tokenDecimals = await tokenContract.decimals();
            tokenSymbol = await tokenContract.symbol();
        } catch (error) {
            console.warn(chalk.yellow(`Could not fetch token info: ${error.message}`));
        }
    }
    
    for (let i = 0; i < wallets.length; i++) {
        const walletAddress = wallets[i].address;
        
        try {
            // Get MON balance
            const monBalance = await provider.getBalance(walletAddress);
            const monFormatted = formatMon(monBalance);
            totalMON += monBalance;
            
            // Get token balance if token address provided
            let tokenBalance = 0n;
            let tokenFormatted = '0';
            if (tokenAddress) {
                try {
                    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
                    tokenBalance = await tokenContract.balanceOf(walletAddress);
                    tokenFormatted = ethers.formatUnits(tokenBalance, tokenDecimals);
                    totalTokens += tokenBalance;
                } catch (error) {
                    tokenFormatted = 'Error';
                }
            }
            
            console.log(chalk.cyan(`Wallet ${i + 1}: ${walletAddress}`));
            console.log(`  MON: ${chalk.green(monFormatted)} MON`);
            if (tokenAddress) {
                console.log(`  ${tokenSymbol}: ${chalk.green(tokenFormatted)} ${tokenSymbol}`);
            }
            console.log('');
            
        } catch (error) {
            console.error(chalk.red(`Error checking balance for wallet ${i + 1}: ${error.message}`));
        }
    }
    
    console.log(chalk.yellow('='.repeat(80)));
    console.log(chalk.blue('\nTotals:'));
    console.log(`  Total MON: ${chalk.green(formatMon(totalMON))} MON`);
    if (tokenAddress) {
        console.log(`  Total ${tokenSymbol}: ${chalk.green(ethers.formatUnits(totalTokens, tokenDecimals))} ${tokenSymbol}`);
    }
    console.log('');
}
