import fs from 'fs';

// Load configuration from config.json
async function loadConfig() {
    try {
        const configData = fs.readFileSync('./config.json', 'utf8');
        const config = JSON.parse(configData);
        
        return {
            rpcURL: config.rpc || config.rpcURL,
            wsURL: config.ws || config.wsURL,
            chainId: config.chainId || 10143, // Monad Testnet default
            delay: config.delay || 5000,
            slippage: config.slippage || 0.05, // 5% slippage default
            minBuy: config.minBuy || 0.0001,
            maxBuy: config.maxBuy || 0.1,
            microBuyAmount: config.microBuyAmount || 0.0001,
            sender: config.sender, // Private key of main wallet
            devWallet: config.devWallet, // Address to monitor for new launches
            useBundle: config.useBundle !== false, // Use transaction bundling (default true)
            gasPrice: config.gasPrice, // Optional: gas price in gwei
            gasLimit: config.gasLimit || 300000, // Default gas limit
            maxWalletsPerBundle: config.maxWalletsPerBundle || null, // Max wallets per bundle (null = unlimited)
            // Nad.fun contract addresses
            contracts: {
                bondingCurveRouter: config.contracts?.bondingCurveRouter || "0x6F6B8F1a20703309951a5127c45B49b1CD981A22",
                bondingCurve: config.contracts?.bondingCurve || "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE",
                dexRouter: config.contracts?.dexRouter || "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137",
                dexFactory: config.contracts?.dexFactory || "0x6B5F564339DbAD6b780249827f2198a841FEB7F3",
                wmon: config.contracts?.wmon || "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
                lens: config.contracts?.lens || "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea"
            }
        };
    } catch (error) {
        console.error('Error loading config:', error);
        throw error;
    }
}

export default loadConfig;
