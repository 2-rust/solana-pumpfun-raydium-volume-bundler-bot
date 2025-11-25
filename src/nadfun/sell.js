import { ethers } from 'ethers';
import { BONDING_CURVE_ROUTER_ABI, ERC20_ABI } from './abis.js';
import { CONTRACTS, parseMon, formatMon, calculateSlippage } from './constants.js';
import loadConfig from '../loadConfig.js';

/**
 * Get quote for selling tokens on nad.fun bonding curve
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @param {string|BigInt} tokenAmount - Amount of tokens to sell (in tokens or wei)
 * @returns {Promise<Object>} Quote with amount out and router address
 */
export async function getSellQuote(provider, tokenAddress, tokenAmount) {
    
}

/**
 * Execute sell transaction on nad.fun bonding curve
 * @param {ethers.Wallet} wallet - Wallet to execute transaction
 * @param {string} tokenAddress - Token contract address
 * @param {string|BigInt} tokenAmount - Amount of tokens to sell (null = sell all)
 * @param {number} slippagePercent - Slippage tolerance percentage (default 5)
 * @param {Object} options - Additional options (gasPrice, gasLimit, nonce)
 * @returns {Promise<string>} Transaction hash
 */
export async function sellToken(wallet, tokenAddress, tokenAmount = null, slippagePercent = 5, options = {}) {
    const config = await loadConfig();
    const router = new ethers.Contract(CONTRACTS.BONDING_CURVE_ROUTER, BONDING_CURVE_ROUTER_ABI, wallet);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    // Get token balance if tokenAmount not specified
    let amountIn;
    if (tokenAmount === null) {
        const balance = await tokenContract.balanceOf(wallet.address);
        amountIn = balance;
    } else {
        // Get token decimals
        let decimals = 18;
        try {
            decimals = await tokenContract.decimals();
        } catch (error) {
            console.warn('Could not fetch token decimals, assuming 18');
        }
        
        amountIn = typeof tokenAmount === 'string' 
            ? ethers.parseUnits(tokenAmount, decimals) 
            : tokenAmount;
    }
    
    // Check if we need to approve
    const allowance = await tokenContract.allowance(wallet.address, CONTRACTS.BONDING_CURVE_ROUTER);
    if (allowance < amountIn) {
        // Approve tokens
        console.log('Approving tokens...');
        const approveTx = await tokenContract.approve(CONTRACTS.BONDING_CURVE_ROUTER, ethers.MaxUint256);
        await approveTx.wait();
    }
    
    // Get quote
    const quote = await getSellQuote(wallet.provider, tokenAddress, amountIn);
    
    // Calculate minimum amount out with slippage
    const amountOutMin = calculateSlippage(quote.amount, slippagePercent);
    
    // Set deadline (current time + 10 minutes)
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    // Prepare transaction options
    const txOptions = {
        ...options
    };
    
    if (options.gasPrice) {
        txOptions.gasPrice = ethers.parseUnits(options.gasPrice.toString(), 'gwei');
    }
    
    if (options.gasLimit) {
        txOptions.gasLimit = options.gasLimit;
    } else if (config.gasLimit) {
        txOptions.gasLimit = config.gasLimit;
    }
    
    if (options.nonce !== undefined) {
        txOptions.nonce = options.nonce;
    }
    
    try {
        const tx = await router.sell(
            tokenAddress,
            wallet.address, // to
            amountIn,
            amountOutMin,
            deadline,
            txOptions
        );
        
        return tx.hash;
    } catch (error) {
        console.error('Error executing sell:', error);
        throw error;
    }
}

/**
 * Get token balance for a wallet
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Object>} Balance object with raw and formatted amounts
 */
export async function getTokenBalance(provider, tokenAddress, walletAddress) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    try {
        const balance = await tokenContract.balanceOf(walletAddress);
        const decimals = await tokenContract.decimals();
        const formatted = ethers.formatUnits(balance, decimals);
        
        return {
            raw: balance,
            formatted: formatted,
            decimals: decimals
        };
    } catch (error) {
        console.error('Error getting token balance:', error);
        throw error;
    }
}
