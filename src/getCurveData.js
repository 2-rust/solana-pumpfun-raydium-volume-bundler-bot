import { BondingCurveLayout } from "./PUMP_LAYOUT.js";
import { PublicKey, Connection } from "@solana/web3.js";
import loadConfig from "./loadConfig.js";

async function getCurveData(bCurve) {

    const config = await loadConfig();
    const connection = new Connection(config.rpcURL, {
        wsEndpoint: config.wsURL,
        commitment: "confirmed",
    });

    const data = await connection.getAccountInfo(new PublicKey(bCurve));
    if (!data) {
        throw new Error("Account not found");
    }

    const { data: buffer } = data;
    if (!buffer) {
        throw new Error("Buffer not found");
    }

    const curveData = BondingCurveLayout.deserialize(buffer);
    let virtualTokenReserves = curveData.virtualSolReserves.toString();
    let virtualSolReserves = curveData.virtualTokenReserves.toString();

    // Return the data as integers
    virtualSolReserves = parseInt(virtualSolReserves);
    virtualTokenReserves = parseInt(virtualTokenReserves);

    return { virtualTokenReserves, virtualSolReserves };
}

export default getCurveData;