import fetch from "node-fetch";
import chalk from "chalk";
import { faker } from '@faker-js/faker';

async function createProfile(accessToken) {
    const username = genUsername();
    const bio = genBio();

    const url = "https://frontend-api.pump.fun/users";

    const payload = {
        "bio": bio,
        "username": username,
    };

    const headers = {
        "Cookie": `auth_token=${accessToken}`,
        "Content-Type": "application/json"
    }

    const req = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
    });

    const res = await req.json();

    if (!req.ok) {
        console.error(chalk.redBright("Failed to create profile:", JSON.stringify(res, null, 2)));
        return false;
    }

    console.log(chalk.greenBright(`Profile created \nUsername: ${res.username}\nBio: ${res.bio}`));
    return true;
}

function genUsername() {
    let username = '';
    while (username.length === 0 || username.length > 10 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        username = faker.internet.userName().replace(/[^a-zA-Z0-9_]/g, '_');
    }
    return username;
}

function genBio() {
    let bioList = [
        'based degen',
        'mogged 😹🫵',
        'based dev',
        'pump it',
        'for the love of the game',
        '1000x gains',
        'degen trader',
        'just tryna make it',
        'crypto enthusiast',
        'web3 builder',
        '🚀🚀🚀',
        '😹🫵',
        '🦍🦍🦍',
        '🌚🌚🌚',
        'moon it',
        'max jeet',
        'degen',
        'chart dumper',
        'chart pumper',
        'chart chad',
        'ape',
        'cabal dumper',
        'retardio',
        'ansem hater',
        'fuck sahil',
        'on chain gambler',
        'boden 2024',
        'tremp 2024',
        'livin the dream',
        'just tryna snipe',
        'fuck off',
        'pocket watching',
        'Diamond Hands 🦍',
        'WAGMI',
        'MILADY',
        'Buy the Dip',
        'PAMP IT',
        'RETARDIO 🤡',
        'retarded trader',
        'MOONER',
        'top jeet',
        '#1 jeet',
        'average shitcoin lover',
        'Memecoin Mastermind',
        'Bag Holder',
        'send it to fuckin ray',
        'Rug Pull Survivor',
        'Pump Chaser',
        'Rugproof',
        'follow me on twitter',
        'alpha caller',
        'alpha hunter'
    ];

    let randomChoice = Math.floor(Math.random() * bioList.length);
    return bioList[randomChoice];
}

export default createProfile;
