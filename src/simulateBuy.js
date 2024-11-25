import BN from 'bn.js';
import fs from 'fs';

// Function to read reserves from JSON file
function readReserves() {
    const data = fs.readFileSync('./reserves.JSON', 'utf8');
    const reserves = JSON.parse(data);
    return {
        virtualSolReserves: new BN(reserves.vSolReserve),
        virtualTokenReserves: new BN(reserves.vTokenReserve),
        realTokenReserves: new BN(reserves.rTokenReserves),
        feeBasisPoints: new BN(reserves.feeBasisPoints),
        rSolReserves: reserves.rSolReserves,
        tokenTotalSupply: reserves.tokenTotalSupply,
        adjustedVTokenReserve: reserves.adjustedVTokenReserve,
        adjustedVSolReserve: reserves.adjustedVSolReserve,
        virtualTokenPrice: reserves.virtualTokenPrice
    };
}

// Function to update reserves in JSON file
function updateReserves(newReserves) {
    const updatedReserves = {
        vSolReserve: newReserves.virtualSolReserves.toString(),
        vTokenReserve: newReserves.virtualTokenReserves.toString(),
        rTokenReserves: newReserves.realTokenReserves.toString(),
        feeBasisPoints: newReserves.feeBasisPoints.toString(),
        rSolReserves: newReserves.rSolReserves,
        tokenTotalSupply: newReserves.tokenTotalSupply,
        adjustedVTokenReserve: newReserves.adjustedVTokenReserve,
        adjustedVSolReserve: newReserves.adjustedVSolReserve,
        virtualTokenPrice: newReserves.virtualTokenPrice
    };
    fs.writeFileSync('./reserves.JSON', JSON.stringify(updatedReserves, null, 2));
}

function calculateFee(e, feeBasisPoints) {
    return e.mul(feeBasisPoints).div(new BN('10000'));
}

// Updated buy quote function based on provided logic
function buyQuote(e, t) {
    if (e.eq(new BN(0)) || !t) {
        return new BN(0);
    }
    let product = t.virtualSolReserves.mul(t.virtualTokenReserves);
    let newSolReserves = t.virtualSolReserves.add(e);
    let newTokenAmount = product.div(newSolReserves).add(new BN(1));
    let tokensToReceive = t.virtualTokenReserves.sub(newTokenAmount);
    tokensToReceive = BN.min(tokensToReceive, t.realTokenReserves);
    return tokensToReceive;
}

async function calculateBuyAmount(solAmountToBuy) {
    try {
        let t = readReserves(); // Read current reserves from JSON

        let tokens = buyQuote(new BN(solAmountToBuy), t);
        if (tokens.isNeg()) {
            tokens = new BN(0);
        }
        let formattedTokens = tokens.toNumber() / 1e6;
        let formattedSOL = solAmountToBuy / 1e9;
        console.log(`Tokens you can buy with ${formattedSOL} SOL:`, formattedTokens);

        if (formattedSOL === NaN) {
            throw new Error("Invalid input, please provide a valid number.");
        }

        // Update reserves for the next transaction
        let product = t.virtualSolReserves.mul(t.virtualTokenReserves);
        let newSolReserves = t.virtualSolReserves.add(new BN(solAmountToBuy));
        let newTokenAmount = product.div(newSolReserves).add(new BN(1));
        let tokensToReceive = t.virtualTokenReserves.sub(newTokenAmount);
        tokensToReceive = BN.min(tokensToReceive, t.realTokenReserves);

        // Calculate fee and adjust reserves
        let fee = calculateFee(new BN(solAmountToBuy), t.feeBasisPoints);
        t.virtualSolReserves = newSolReserves.sub(fee);
        t.virtualTokenReserves = t.virtualTokenReserves.sub(tokensToReceive);

        // Write updated reserves back to JSON
        updateReserves({
            ...t, // Include all other properties
            virtualSolReserves: t.virtualSolReserves.toString(),
            virtualTokenReserves: t.virtualTokenReserves.toString(),
            realTokenReserves: t.realTokenReserves.toString(),
            feeBasisPoints: t.feeBasisPoints.toString()
        });

        return formattedTokens;
    } catch (error) {
        const logFilePath = "./logs.txt";
        const errorMessage = `Error occurred: ${error.message || error}\n`;
        fs.appendFileSync(logFilePath, errorMessage);
        console.log("An error occurred, check logs.txt for more information.");
        throw error; // Rethrow the error after logging it
    }
}

export default calculateBuyAmount;