import { ethers } from 'ethers';
import chalk from 'chalk';
import { buyToken } from './buy.js';
import { getBuyQuote } from './buy.js';
import { parseMon } from './constants.js';

/**
 * Handle the token creation percentage issue
 * When users create tokens on nad.fun, they hold a percentage of tokens.
 * This function can buy tokens from the creator to reduce their percentage.
 * 
 * @param {ethers.Wallet} wallet - Wallet to use for buying
 * @param {string} tokenAddress - Token contract address
 * @param {string} creatorAddress - Creator's wallet address
 * @param {Object} options - Options for buying from creator
 * @returns {Promise<Object>} Result of the operation
 */
export async function buyFromCreator(wallet, tokenAddress, creatorAddress, options = {}) {
    const {
        maxBuyAmount = parseMon("1.0"), // Maximum MON to spend
        targetPercentageReduction = 10, // Reduce creator's percentage by this amount
        slippagePercent = 5
    } = options;
    
    console.log(chalk.blue(`Buying tokens from creator ${creatorAddress} to reduce their percentage...`));
    
    try {
        // For now, we'll execute a buy transaction which will reduce the creator's percentage
        // In the future, if nad.fun provides a direct way to buy from creators, we can use that
        
        // Get quote for buying
        const quote = await getBuyQuote(wallet.provider, tokenAddress, maxBuyAmount);
        
        console.log(chalk.green(`Quote: ${quote.formattedAmount} tokens for ${maxBuyAmount / parseMon("1.0")} MON`));
        
        // Execute buy
        const txHash = await buyToken(wallet, tokenAddress, maxBuyAmount, slippagePercent);
        
        console.log(chalk.green(`✓ Bought tokens from bonding curve: ${txHash}`));
        
        return {
            success: true,
            txHash: txHash,
            tokensReceived: quote.formattedAmount
        };
        
    } catch (error) {
        console.error(chalk.red(`Error buying from creator: ${error.message}`));
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Calculate creator's token percentage
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @param {string} creatorAddress - Creator's wallet address
 * @returns {Promise<Object>} Creator's percentage and balance info
 */
export async function getCreatorPercentage(provider, tokenAddress, creatorAddress) {
    const { ethers } = await import('ethers');
    const { ERC20_ABI } = await import('./abis.js');
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    try {
        const creatorBalance = await tokenContract.balanceOf(creatorAddress);
        const totalSupply = await tokenContract.totalSupply();
        const decimals = await tokenContract.decimals();
        
        const percentage = (Number(creatorBalance) / Number(totalSupply)) * 100;
        
        return {
            balance: creatorBalance,
            formattedBalance: ethers.formatUnits(creatorBalance, decimals),
            totalSupply: totalSupply,
            percentage: percentage,
            percentageFormatted: percentage.toFixed(2) + '%'
        };
    } catch (error) {
        console.error('Error calculating creator percentage:', error);
        throw error;
    }
}
