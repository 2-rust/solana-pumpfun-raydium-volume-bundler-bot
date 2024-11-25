import prompt from 'prompt-sync';
import * as fs from 'fs';
import * as path from 'path';
import loadWallets from './loadWallets.js';

const prompter = prompt();

async function parseTypeOfBuyAmounts() {
    console.log('Please select the type of buy amounts you wish to set:');
    console.log('1. Random amounts within a range');
    console.log('2. Same amount for all wallets');
    console.log('3. Unique amounts for each wallet');

    const choice = parseInt(prompter('Enter the number of your choice: '));
    const choiceMap = {
        1: 'random',
        2: 'same',
        3: 'unique',
    };
    return choiceMap[choice];
}

async function promptBuyAmounts() {
    let buyAmounts = [];

    const type = await parseTypeOfBuyAmounts();
    const wallets = await loadWallets();
    const numWallets = wallets.length;

    if (type === 'random') {
        const minBuy = parseFloat(prompter('Enter minimum buy amount (SOL): '));
        const maxBuy = parseFloat(prompter('Enter maximum buy amount (SOL): '));
        for (let i = 0; i < numWallets; i++) {
            let buyAmount = Math.random() * (maxBuy - minBuy) + minBuy;
            buyAmount = parseFloat(buyAmount.toFixed(3));
            buyAmounts.push(buyAmount);
        }
    } else if (type === 'same') {
        const buyAmount = parseFloat(prompter('Enter buy amount (SOL) for all wallets: '));
        buyAmounts = Array(numWallets).fill(buyAmount);
    } else if (type === 'unique') {
        for (let i = 0; i < numWallets; i++) {
            const buyAmount = parseFloat(prompter(`Enter buy amount (SOL) for Wallet ${i + 1}: `));
            buyAmounts.push(buyAmount);
        }
    }

    const buyAmountsObj = buyAmounts.reduce((acc, amount, index) => {
        acc[`wallet${index + 1}`] = amount;
        return acc;
    }, {});

    const jsonData = JSON.stringify(buyAmountsObj, null, 2);

    // Use relative path to write to the main directory
    const filePath = path.join(process.cwd(), 'buyAmounts.json');
    fs.writeFileSync(filePath, jsonData);

    console.log(`Buy amounts have been saved to ${filePath}`);

    return buyAmounts;
}

export default promptBuyAmounts;