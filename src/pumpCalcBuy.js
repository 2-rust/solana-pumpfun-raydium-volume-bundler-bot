import BN from 'bn.js';
import GPA from './pumpDecode.js';
import fs from 'fs';

// Calculation of buy quote with dynamic bonding curve data
async function humanBuyAmount(bondingCurvePublicKey, solAmountToBuy) {


    // Function to calculate fees
    function calculateFee(e, feeBasisPoints) {
        return e.mul(feeBasisPoints).div(new BN('10000'));
    }

    // Simplified buy quote function without the isBuy check
    function buyQuote(e, t) {
        try {

            if (e.eq(new BN(0)) || !t) {
                return new BN(0);
            }

            let product = t.virtualSolReserves.mul(t.virtualTokenReserves);
            let newSolReserves = t.virtualSolReserves.add(e);
            let newTokenAmount = product.div(newSolReserves).add(new BN(1));
            let s = t.virtualTokenReserves.sub(newTokenAmount);
            s = BN.min(s, t.realTokenReserves);
            let fee = calculateFee(e, t.feeBasisPoints);
            return s;
        } catch (error) {
            // Write error to log file 
            const logFilePath = "./logs.txt";
            const errorMessage = `Error occurred: ${error.message || error}\n`;
            fs.appendFileSync(logFilePath, errorMessage);
            console.log("An error occurred, check logs.txt for more information.");
            throw error; // Rethrow the error after logging it
        }
    }

    export default humanBuyAmount;
