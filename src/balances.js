import { PublicKey, Connection } from '@solana/web3.js';
import fetchTokens from './fetchTokens.js';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import chalk from 'chalk';

async function checkBalances() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const wallets = await loadWallets();

    let totalBalance = 0;

    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        const walletPublicKey = new PublicKey(wallet.pubKey);

        const balance = await connection.getBalance(walletPublicKey);
        console.log(`Wallet ${i + 1}: ${balance / 1e9} SOL`);

    
        totalBalance += (balance / 1e9);

        // Fetch SPL token balances
        const tokenCAs = await fetchTokens(wallet.pubKey);
        if (tokenCAs.length === 0) {
            console.log(chalk.red("No SPL tokens found for this wallet."));
        } else {
            console.log(`Tokens for Wallet ${i + 1}:`);
            const tokenTable = tokenCAs.map((tokenCA, index) => ({
                Mint: tokenCA.CA,
                Balance: tokenCA.balance
            }));
            console.table(tokenTable);
        }
    }
    console.log(chalk.greenBright(`Total Balance: ${totalBalance.toFixed(4)} SOL`));
    console.log(chalk.redBright("BALANCES MAY TAKE A FEW SECONDS TO LOAD, RERUN IF THEY DO NOT SHOW UP OR CHECK JITO TXS"));

}
export default checkBalances;