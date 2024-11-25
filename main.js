import readline from 'readline';
import chalk from 'chalk';
import fs from 'fs';

import buyThePumpJito from './src/jitoBuy.js';
import sellTheDump from './src/pumpSell.js';
import raySell from './src/raydium/sell.js';
import genWallet from './src/walletGen.js';
import distro from './src/distro.js';
import refund from './src/refund.js';
import checkBalances from './src/balances.js';
import walletTracker from './src/walletMonitor.js';
import humanMode from './src/humanMode.js';
import staggerBuy from './src/staggerBuy.js';
import closeTokenAccounts from './src/closeAccounts.js';
import sendSPL from './src/transferSPL.js';
import singleSell from './src/singleSell.js';
import microBuySpam from './src/microBuy.js';
import createPumpProfiles from './src/profile/main.js';
import buyAndSell from './src/sameTX.js';
import cleanup from './src/cleanup.js';
import warmupWallets from './src/warmup.js';
import delaySell from './src/delaySell.js';
import unwrapWSOL from './src/raydium/unwrap.js';
import promptBuyAmounts from './src/buyAmt.js';

process.removeAllListeners('warning');
process.removeAllListeners('ExperimentalWarning');

let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function promptUser(promptText) {
    return new Promise((resolve) => {
        rl.question(promptText, (answer) => {
            resolve(answer);
        });
    });
}

rl.on('SIGINT', () => {
    process.exit();
});


async function printAscii() {
    const ascii = fs.readFileSync('./ascii.txt', 'utf8');
    console.log("\n");
    console.log(chalk.green(ascii));
    console.log(chalk.blue("By Infinity Scripts\n"));
}   

printAscii();
// Define the main menu
async function mainMenu() {
    console.log(chalk.bgBlack.green('\n=== Main Menu ===\n'));
    console.log(chalk.bold.red('CTRL + C to exit at any point\n'));
    console.log(chalk.yellow('1:') + chalk.hex('#4ECDC4')(' Buy Modes'));
    console.log(chalk.yellow('2:') + chalk.hex('#FF6B6B')(' Sell Modes')); 
    console.log(chalk.yellow('3:') + chalk.hex('#45B7D1')(' Wallets'));
    console.log(chalk.yellow('4:') + chalk.hex('#FF8C42')(' Transfer'));
    console.log(chalk.yellow('Q:') + chalk.hex('#C04CFD')(' Quit'));

    const action = await promptUser("\n--> ");
    return action.toUpperCase();
}

// Define the sub-menus
async function buyMenu() {
    console.clear();
    console.log(chalk.bgCyan.black('\n=== Buy Modes ===\n'));
    console.log(chalk.yellow('1:') + chalk.hex('#FF6B6B')(' Bundle Buy (JITO)'));
    console.log(chalk.yellow('2:') + chalk.hex('#4ECDC4')(' Auto Volume'));
    console.log(chalk.yellow('3:') + chalk.hex('#45B7D1')(' Human Mode'));
    console.log(chalk.yellow('4:') + chalk.hex('#FF8C42')(' MicroBuy (SPAM)'));
    console.log(chalk.yellow('5:') + chalk.hex('#98D8C8')(' BumpBot'));
    console.log(chalk.yellow('6:') + chalk.hex('#F3A712')(' Warmup Mode'));
    console.log(chalk.yellow('7:') + chalk.hex('#064f8c')(' Stagger Buy'));
    console.log(chalk.yellow('8:') + chalk.hex('#C04CFD')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

async function sellMenu() {
    console.clear();
    console.log(chalk.bgMagenta.black('\n=== Sell Modes ===\n'));
    console.log(chalk.yellow('1:') + chalk.hex('#FF6B6B')(' Sell All (JITO)'));
    console.log(chalk.yellow('2:') + chalk.hex('#4ECDC4')(' Single Wallet Sell'));
    console.log(chalk.yellow('3:') + chalk.hex('#FF8C42')(' Delay Sell'));
    console.log(chalk.yellow('4:') + chalk.hex('#45B7D1')(' Cleanup Mode'));
    console.log(chalk.yellow('5:') + chalk.hex('#C1D4H4')(' Ray Single Sell'));
    console.log(chalk.yellow('6:') + chalk.hex('#C04CFD')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

async function walletMenu() {
    console.clear();
    console.log(chalk.bgGreen.black('\n=== Wallets ===\n'));
    console.log(chalk.yellow('1:') + chalk.hex('#6A5ACD')(' Gen Wallets'));
    console.log(chalk.yellow('2:') + chalk.hex('#4ECDC4')(' Check Balances'));
    console.log(chalk.yellow('3:') + chalk.hex('#45B7D1')(' Close Token Accounts'));
    console.log(chalk.yellow('4:') + chalk.hex('#FF8C42')(' Create Profiles'));
    console.log(chalk.yellow('5:') + chalk.hex('#C04CFD')(' Unwrap WSOL'));
    console.log(chalk.yellow('6:') + chalk.hex('#4CAF50')(' Set Buy Amounts'));
    console.log(chalk.yellow('7:') + chalk.hex('#FF0000')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

async function transferMenu() {
    console.clear();
    console.log(chalk.bgYellow.black('\n=== Transfer ===\n'));
    console.log(chalk.blue('1:') + chalk.hex('#FF6B6B')(' Send to Volume Wallets'));
    console.log(chalk.blue('2:') + chalk.hex('#4ECDC4')(' Return to Main Wallet'));
    console.log(chalk.blue('3:') + chalk.hex('#45B7D1')(' Transfer SPL to Main Wallet'));
    console.log(chalk.blue('4:') + chalk.hex('#C04CFD')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

// Handle actions based on user input
async function handleAction(action) {
    switch (action) {
        case '1':
            await handleBuyMenu();
            return;
        case '2':
            await handleSellMenu();
            return;
        case '3':
            await handleWalletMenu();
            return;
        case '4':
            await handleTransferMenu();
            return;
        case 'Q':
            console.log(chalk.red("Goodbye"));
            process.exit(0);
        default:
            console.log(chalk.red("Invalid input, please try again."));
    }
}

// Handle buy menu actions
async function handleBuyMenu() {
    const action = await buyMenu();
    switch (action) {
        case '1':
            let mint = await promptUser("Enter Token CA: ");
            let delay = await promptUser("Enter delay in ms (1s = 1000): ");
            console.log(chalk.green(`Generating Volume for ${mint}`));
            await buyThePumpJito(mint, delay);
            break;
        case '2':
            let autoMinDelay = await promptUser("Enter min delay in seconds: ");
            let autoMaxDelay = await promptUser("Enter max delay in seconds: ");
            let autoSellPct = await promptUser("Enter sell percentage (0 - 100): ");
            console.log(chalk.blue("Starting Wallet Monitor, please launch a token after you see this message!"));
            await walletTracker(autoMinDelay, autoMaxDelay, autoSellPct);
            break;
        case '3':
            let token = await promptUser("Enter Token CA: ");
            let minDelay = await promptUser("Enter min delay in seconds: ");
            let maxDelay = await promptUser("Enter max delay in seconds: ");
            let humanSellPct = await promptUser("Enter sell percentage (0 - 100): ");
            console.log("\n");
            await humanMode(token, minDelay, maxDelay, humanSellPct);
            break;
        case '4':
            let tokenCA = await promptUser("Enter Token CA: ");
            let delayMS = await promptUser("Enter delay in ms (1s = 1000): ");
            await microBuySpam(tokenCA, delayMS);
            break;
        case '5':
            let t = await promptUser("Enter Token CA: ");
            let buyAmt = await promptUser("Enter Buy Amount: ");
            let d = await promptUser("Enter delay in ms (1s = 1000): ");
            await buyAndSell(t, buyAmt, d, rl);
            rl.removeAllListeners('line'); // Add this line
            break;
        case '6':
            let loops = await promptUser("Enter number of loops: ");
            let warmupDelay = await promptUser("Enter delay in ms (1s = 1000): ");
            await warmupWallets(loops, warmupDelay);
            break;
        case '7':
            const staggerCA = await promptUser("Enter Token CA: ");
            const staggerDelay = await promptUser("Enter delay in ms (1s = 1000): ");
            const staggerLoops = await promptUser("Enter number of loops: ");
            const useJito = await promptUser("Use JITO (y/n): ");
            if (useJito.toUpperCase() === 'Y') {
                await staggerBuy(staggerCA, staggerDelay, true, staggerLoops);
            } else {
                await staggerBuy(staggerCA, staggerDelay, false, staggerLoops);
            }
            break;
        case '8':
            return; // Go back to the main menu
        default:
            console.log(chalk.red("Invalid input, please try again."));
            await handleBuyMenu(); // Retry the buy menu
    }
}

// Handle sell menu actions
async function handleSellMenu() {
    const action = await sellMenu();
    switch (action) {
        case '1':
            let mint = await promptUser("Enter Token CA: ");
            let percent = await promptUser("Enter percentage to sell (1 - 100): ");
            await sellTheDump(mint, percent);
            break;
        case '2':
            let token = await promptUser("Enter Token CA: ");
            await singleSell(token, rl);
            break;
        case '3':
            let ca = await promptUser("Enter Token CA: ");
            let delay = await promptUser("Enter delay in ms (1s = 1000): ");
            await delaySell(ca, delay);
            break;
        case '4':
            console.log(chalk.blue("Starting Cleanup Mode, this will sell ALL PF tokens from your sub wallets!"));
            await cleanup();
            break;
        case '5':
            let tokenCA = await promptUser("Enter Token CA: ");
            let rayPercent = await promptUser("Enter percentage to sell (1 - 100): ");
            await raySell(tokenCA, parseInt(rayPercent));
            break;
        case '6':
            return; // Go back to the main menu
        default:
            console.log(chalk.red("Invalid input, please try again."));
            await handleSellMenu(); // Retry the sell menu
    }
}

// Handle wallet menu actions
async function handleWalletMenu() {
    const action = await walletMenu();
    switch (action) {
        case '1':
            let amount = await promptUser("Enter amount of wallets to generate: ");
            await genWallet(amount);
            break;
        case '2':
            await checkBalances();
            break;
        case '3':
            await closeTokenAccounts();
            break;
        case '4':
            await createPumpProfiles();
            break;
        case '5':
            await unwrapWSOL();
            break;
        case '6':
            await promptBuyAmounts();
            break;
        case '7':
            return; // Go back to the main menu
        default:
            console.log(chalk.red("Invalid input, please try again."));
            await handleWalletMenu(); // Retry the wallet menu
    }
}

// Handle transfer menu actions
async function handleTransferMenu() {
    const action = await transferMenu();
    switch (action) {
        case '1':
            await distro();
            break;
        case '2':
            console.log(chalk.blue("Returning all SOL to dev wallet..."));
            await refund();
            break;
        case '3':
            let mint = await promptUser("Enter Token CA: ");
            let recieveWallet = await promptUser("Enter receiver wallet (public key): ");
            await sendSPL(mint, recieveWallet);
            break;
        case '4':
            return; // Go back to the main menu
        default:
            console.log(chalk.red("Invalid input, please try again."));
            await handleTransferMenu(); // Retry the transfer menu
    }
}

// Main function to run the menu
async function main() {
    while (true) {
        const action = await mainMenu();
        await handleAction(action);
    }
}

main().catch(console.error).finally(() => {
    rl.close();
});