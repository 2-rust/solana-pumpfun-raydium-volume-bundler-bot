import { ethers } from 'ethers';
import { BONDING_CURVE_ROUTER_ABI, ERC20_ABI } from './abis.js';
import { CONTRACTS, parseMon, formatMon, calculateSlippage } from './constants.js';
import loadConfig from '../loadConfig.js';

/**
 * Get quote for buying tokens on nad.fun bonding curve
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @param {string|BigInt} monAmount - Amount of MON to spend (in MON or wei)
 * @returns {Promise<Object>} Quote with amount out and router address
 */
export async function getBuyQuote(provider, tokenAddress, monAmount) {
    const config = await loadConfig();
    const router = new ethers.Contract(CONTRACTS.BONDING_CURVE_ROUTER, BONDING_CURVE_ROUTER_ABI, provider);
    
    // Convert MON amount to wei if string
    const amountIn = typeof monAmount === 'string' ? parseMon(monAmount) : monAmount;
    
    try {
        const result = await router.getAmountOut(tokenAddress, amountIn, true);
        return {
            amount: result.amount,
            router: result.router || CONTRACTS.BONDING_CURVE_ROUTER,
            formattedAmount: formatMon(result.amount)
        };
    } catch (error) {
        console.error('Error getting buy quote:', error);
        throw error;
    }
}

/**
 * Execute buy transaction on nad.fun bonding curve
 * @param {ethers.Wallet} wallet - Wallet to execute transaction
 * @param {string} tokenAddress - Token contract address
 * @param {string|BigInt} monAmount - Amount of MON to spend
 * @param {number} slippagePercent - Slippage tolerance percentage (default 5)
 * @param {Object} options - Additional options (gasPrice, gasLimit, nonce)
 * @returns {Promise<string>} Transaction hash
 */
export async function buyToken(wallet, tokenAddress, monAmount, slippagePercent = 5, options = {}) {
    const config = await loadConfig();
    const router = new ethers.Contract(CONTRACTS.BONDING_CURVE_ROUTER, BONDING_CURVE_ROUTER_ABI, wallet);
    
    // Get quote first
    const quote = await getBuyQuote(wallet.provider, tokenAddress, monAmount);
    
    // Calculate minimum amount out with slippage
    const amountOutMin = calculateSlippage(quote.amount, slippagePercent);
    
    // Convert MON amount to wei if string
    const amountIn = typeof monAmount === 'string' ? parseMon(monAmount) : monAmount;
    
    // Set deadline (current time + 10 minutes)
    const deadline = Math.floor(Date.now() / 1000) + 600;
    
    // Prepare transaction
    const txOptions = {
        value: amountIn, // Send MON as native token
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
        const tx = await router.buy(
            tokenAddress,
            wallet.address, // to
            amountIn,
            amountOutMin,
            deadline,
            txOptions
        );
        
        return tx.hash;
    } catch (error) {
        console.error('Error executing buy:', error);
        throw error;
    }
}

/**
 * Check if token is listed on bonding curve
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @returns {Promise<boolean>} True if listed
 */
export async function isTokenListed(provider, tokenAddress) {
    const router = new ethers.Contract(CONTRACTS.BONDING_CURVE_ROUTER, BONDING_CURVE_ROUTER_ABI, provider);
    
    try {
        return await router.isListed(tokenAddress);
    } catch (error) {
        console.error('Error checking if token is listed:', error);
        return false;
    }
}

/**
 * Get bonding curve reserves
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string} tokenAddress - Token contract address
 * @returns {Promise<Object>} Reserves object with reserveMon and reserveToken
 */
export async function getCurveReserves(provider, tokenAddress) {
    const router = new ethers.Contract(CONTRACTS.BONDING_CURVE_ROUTER, BONDING_CURVE_ROUTER_ABI, provider);
    
    try {
        const [reserveMon, reserveToken] = await router.getCurves(tokenAddress);
        return {
            reserveMon: reserveMon,
            reserveToken: reserveToken,
            formattedReserveMon: formatMon(reserveMon),
            formattedReserveToken: formatMon(reserveToken)
        };
    } catch (error) {
        console.error('Error getting curve reserves:', error);
        throw error;
    }
}
