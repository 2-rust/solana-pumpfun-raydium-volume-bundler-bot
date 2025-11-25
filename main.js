import readline from 'readline';
import chalk from 'chalk';
import fs from 'fs';

import nadfunBuy from './src/nadfunBuy.js';
import nadfunSell from './src/nadfunSell.js';
import genWallet from './src/walletGen.js';
import distro, { refund } from './src/transferMON.js';
import checkBalances from './src/checkBalances.js';
import walletTracker from './src/nadfunWalletMonitor.js';
import humanMode from './src/nadfunHumanMode.js';
import singleSell from './src/nadfunSingleSell.js';
import cleanup from './src/nadfunCleanup.js';
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
    try {
        const ascii = fs.readFileSync('./ascii.txt', 'utf8');
        console.log("\n");
        console.log(chalk.green(ascii));
    } catch (error) {
        console.log(chalk.green("\n╔═══════════════════════════════════════╗"));
        console.log(chalk.green("║   Nad.fun Volume Bundler Bot          ║"));
        console.log(chalk.green("║   Monad Network - EVM                  ║"));
        console.log(chalk.green("╚═══════════════════════════════════════╝\n"));
    }
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
    console.log(chalk.yellow('1:') + chalk.hex('#FF6B6B')(' Bundle Buy (Nad.fun)'));
    console.log(chalk.yellow('2:') + chalk.hex('#4ECDC4')(' Auto Volume'));
    console.log(chalk.yellow('3:') + chalk.hex('#45B7D1')(' Human Mode'));
    console.log(chalk.yellow('4:') + chalk.hex('#C04CFD')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

async function sellMenu() {
    console.clear();
    console.log(chalk.bgMagenta.black('\n=== Sell Modes ===\n'));
    console.log(chalk.yellow('1:') + chalk.hex('#FF6B6B')(' Sell All (Bundle)'));
    console.log(chalk.yellow('2:') + chalk.hex('#4ECDC4')(' Single Wallet Sell'));
    console.log(chalk.yellow('3:') + chalk.hex('#45B7D1')(' Cleanup Mode'));
    console.log(chalk.yellow('4:') + chalk.hex('#C04CFD')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

async function walletMenu() {
    console.clear();
    console.log(chalk.bgGreen.black('\n=== Wallets ===\n'));
    console.log(chalk.yellow('1:') + chalk.hex('#6A5ACD')(' Gen Wallets'));
    console.log(chalk.yellow('2:') + chalk.hex('#4ECDC4')(' Check Balances'));
    console.log(chalk.yellow('3:') + chalk.hex('#4CAF50')(' Set Buy Amounts'));
    console.log(chalk.yellow('4:') + chalk.hex('#FF0000')(' Back to Main Menu'));

    const action = await promptUser('\n--> ');
    return action.toUpperCase();
}

async function transferMenu() {
    console.clear();
    console.log(chalk.bgYellow.black('\n=== Transfer ===\n'));
    console.log(chalk.blue('1:') + chalk.hex('#FF6B6B')(' Send MON to Volume Wallets'));
    console.log(chalk.blue('2:') + chalk.hex('#4ECDC4')(' Return MON to Main Wallet'));
    console.log(chalk.blue('3:') + chalk.hex('#C04CFD')(' Back to Main Menu'));

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
            await nadfunBuy(mint, parseInt(delay));
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
            await nadfunSell(mint, parseInt(percent));
            break;
        case '2':
            let token = await promptUser("Enter Token CA: ");
            await singleSell(token, rl);
            break;
        case '3':
            console.log(chalk.blue("Starting Cleanup Mode, this will sell ALL Nad.fun tokens from your sub wallets!"));
            await cleanup();
            break;
        case '4':
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
            await genWallet(parseInt(amount));
            break;
        case '2':
            let tokenCA = await promptUser("Enter Token CA (or press Enter to check MON only): ");
            await checkBalances(tokenCA || null);
            break;
        case '3':
            await promptBuyAmounts();
            break;
        case '4':
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
            let amountPerWallet = await promptUser("Enter amount per wallet in MON (or press Enter for auto): ");
            await distro(amountPerWallet || null);
            break;
        case '2':
            console.log(chalk.blue("Returning all MON to main wallet..."));
            await refund();
            break;
        case '3':
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