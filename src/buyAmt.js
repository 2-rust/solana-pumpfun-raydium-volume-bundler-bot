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
    
}

export default promptBuyAmounts;
