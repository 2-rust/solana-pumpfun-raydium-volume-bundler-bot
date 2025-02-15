import { PublicKey, Connection } from "@solana/web3.js";
import loadConfig from './loadConfig.js';
import chalk from "chalk";
import autoVolume from "./genVolume.js";

async function walletTracker(minDelay, maxDelay, sellPct) {
    const config = await loadConfig();
    const devWallet = config.devWallet;
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, { commitment: 'confirmed', wsEndpoint: ws });

    console.log(chalk.green("Monitoring " + devWallet + " for new transactions..."));
    const trackMe = new PublicKey(devWallet);

    return new Promise((resolve, reject) => {
        connection.onLogs(
            trackMe,
            async ({ logs, err, signature }) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (logs && logs.some(log => log.includes("InitializeMint2"))) {
                    console.log(chalk.green("New transaction detected: " + signature));
                    await fetchAccounts(signature, connection, minDelay, maxDelay, sellPct);
                    resolve(); // Resolve the promise when processing is complete
                }
            },
            "confirmed"
        );
    });
}

async function fetchAccounts(txId, connection, minDelay, maxDelay, sellPct) {
    await autoVolume(ca, bondingCurve, associatedCurve, minDelay, maxDelay, sellPct);

}
export default walletTracker;