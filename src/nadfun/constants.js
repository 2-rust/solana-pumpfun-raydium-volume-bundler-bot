// Nad.fun contract addresses (Monad Testnet)
export const CONTRACTS = {
    BONDING_CURVE_ROUTER: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22",
    BONDING_CURVE: "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE",
    DEX_ROUTER: "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137",
    DEX_FACTORY: "0x6B5F564339DbAD6b780249827f2198a841FEB7F3",
    WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
    LENS: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea"
};

export const CHAIN_ID = 10143; // Monad Testnet

import { ethers } from 'ethers';

// Helper function to parse MON amount (18 decimals)
export function parseMon(amount) {
    return ethers.parseUnits(amount.toString(), 18);
}

// Helper function to format MON amount from wei
export function formatMon(amount) {
    return ethers.formatUnits(amount, 18);
}

// Calculate slippage tolerance
// slippagePercent is a number like 5 for 5%
export function calculateSlippage(amount, slippagePercent) {
    const slippageMultiplier = BigInt(Math.floor((100 - slippagePercent) * 100));
    return (amount * slippageMultiplier) / 10000n;
}
