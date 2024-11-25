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
    const PUMP_PUBLIC_KEY = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

    const tx = await connection.getParsedTransaction(
        txId,
        {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        }
    );

    const accounts = tx?.transaction.message.instructions.find(ix => ix.programId.toBase58() === PUMP_PUBLIC_KEY).accounts;
    if (!accounts || accounts.length === 0) {
        console.log("No accounts found in the transaction.");
        return;
    }

    let mint = accounts[0];
    let bCurve = accounts[2];
    let aCurve = accounts[3];

    const ca = mint.toBase58();
    const bondingCurve = bCurve.toBase58();
    const associatedCurve = aCurve.toBase58();

    console.log(chalk.greenBright("New Mint detected: ", mint.toBase58()));

    // set a delay to allow the mint to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(chalk.blueBright("Generating Volume Now..."));

    await autoVolume(ca, bondingCurve, associatedCurve, minDelay, maxDelay, sellPct);

}
export default walletTracker;