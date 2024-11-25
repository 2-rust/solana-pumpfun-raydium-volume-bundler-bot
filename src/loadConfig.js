import fs from 'fs';
async function loadConfig() {
    const rawConfig = fs.readFileSync("./config.json", "utf8");
    const parsedConfig = JSON.parse(rawConfig);
    let rpcURL = parsedConfig.rpc;
    let wsURL = parsedConfig.ws;
    let minBuy = parsedConfig.minBuy;
    let maxBuy = parsedConfig.maxBuy;
    let microBuyAmount = parsedConfig.microBuyAmount;
    let computeUnit = parsedConfig.computeUnit;
    let computeLimit = parsedConfig.computeLimit;
    let blockEngineURL = parsedConfig.blockEngineUrl;
    let jitoTip = parsedConfig.jitoTipPK;
    let jitoTipAmount = parsedConfig.jitoTipAmount;
    let sender = parsedConfig.sender;
    let devWallet = parsedConfig.devWallet;
    let delay = parsedConfig.delay;
    let slippage = parsedConfig.slippage;
    let useJITO = parsedConfig.useJITO;

    // Convert to integers if they are not floats
    computeLimit = computeLimit.includes('.') ? parseFloat(computeLimit) : parseInt(computeLimit, 10);
    computeUnit = computeUnit.includes('.') ? parseFloat(computeUnit) : parseInt(computeUnit, 10);
    microBuyAmount = microBuyAmount.includes('.') ? parseFloat(microBuyAmount) : parseInt(microBuyAmount, 10);
    minBuy = parsedConfig.minBuy.includes('.') ? parseFloat(parsedConfig.minBuy) : parseInt(parsedConfig.minBuy, 10);
    maxBuy = parsedConfig.maxBuy.includes('.') ? parseFloat(parsedConfig.maxBuy) : parseInt(parsedConfig.maxBuy, 10);

    return {
        rpcURL,
        wsURL,
        minBuy,
        maxBuy,
        microBuyAmount,
        computeUnit,
        computeLimit,
        blockEngineURL,
        jitoTip,
        jitoTipAmount,
        sender,
        devWallet,
        delay,
        slippage,
        useJITO
    };
}
export default loadConfig;