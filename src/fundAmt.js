import prompt from 'prompt-sync';
import * as fs from 'fs';
import * as path from 'path';

const prompter = prompt();

async function parseTypeOfAmounts() {
    console.log('Please select the type of fund amounts you wish to set:');
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

async function promptFundAmounts(numWallets) {
    let fundAmounts = [];

    const type = await parseTypeOfAmounts();

    if (type === 'random') {
        const minBuy = parseFloat(prompter('Enter minimum funding amount (SOL): '));
        const maxBuy = parseFloat(prompter('Enter maximum funding amount (SOL): '));
        for (let i = 0; i < numWallets; i++) {
            let fundAmount = Math.random() * (maxBuy - minBuy) + minBuy;
            fundAmount = parseFloat(fundAmount.toFixed(3));
            fundAmounts.push(fundAmount);
        }
    } else if (type === 'same') {
        const fundAmount = parseFloat(prompter('Enter funding amount (SOL) for all wallets: '));
        fundAmounts = Array(numWallets).fill(fundAmount);
    } else if (type === 'unique') {
        for (let i = 0; i < numWallets; i++) {
            const fundAmount = parseFloat(prompter(`Enter funding amount (SOL) for Wallet ${i + 1}: `));
            fundAmounts.push(fundAmount);
        }
    }

    const fundAmountsObj = fundAmounts.reduce((acc, amount, index) => {
        acc[`wallet${index + 1}`] = amount;
        return acc;
    }, {});

    const jsonData = JSON.stringify(fundAmountsObj, null, 2);

    // Use relative path to write to the main directory
    const filePath = path.join(process.cwd(), 'fundAmounts.json');
    fs.writeFileSync(filePath, jsonData);

    console.log(`Fund amounts have been saved to ${filePath}`);

    return fundAmounts;
}

export default promptFundAmounts;