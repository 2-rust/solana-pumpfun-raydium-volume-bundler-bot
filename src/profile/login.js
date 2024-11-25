import fetch from "node-fetch";
import signAndEncodeSignature from "./signTX.js";
import chalk from "chalk";
import loadWallets from "./readWallets.js";
import createProfile from "./createProfile.js";

async function signIntoPump(pubKey, privKey) {
    try {
        const signature = await signAndEncodeSignature(privKey);

        const payload = {
            address: pubKey,
            signature: signature.signature,
            timestamp: signature.timestamp,
        };

        const headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Origin": "https://pump.fun",
            "Referer": "https://pump.fun/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        };

        const response = await fetch("https://frontend-api.pump.fun/auth/login", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: headers,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const cookies = response.headers.get('set-cookie');
        let authToken = null;
        if (cookies) {
            const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
            if (authCookie) {
                authToken = authCookie.split('=')[1];
            }
        }

        if (!authToken) {
            console.log("All response headers:", response.headers.raw());
            throw new Error("Auth token not found in response cookies");
        }

        console.log(chalk.magenta("Signed in successfully with wallet:", pubKey));

        return authToken;
    } catch (error) {
        console.error("Failed to sign in:", error);
        throw error;
    }
}

async function signIn() {
    const wallets = await loadWallets();
    console.log(chalk.green(`Loaded ${wallets.length} wallets.`));

    for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        console.log(chalk.magenta(`Signing in with wallet ${i + 1}/${wallets.length}: ${wallet.pubKey}`));
        const accessToken = await signIntoPump(wallet.pubKey, wallet.privKey);
        if (accessToken) {
            const profileCreated = await createProfile(accessToken);
            if (!profileCreated) {
                console.error(chalk.red(`Failed to create profile for wallet ${i + 1}/${wallets.length}: ${wallet.pubKey}`));
                break;
            }
        } else {
            console.error(chalk.red(`Failed to get access token for wallet ${i + 1}/${wallets.length}: ${wallet.pubKey}`));
            break;
        }
        await new Promise(resolve => setTimeout(resolve, 3000)); // Delay of 3 seconds between each wallet
    }

    console.log("Finished processing wallets.");
}

export default signIn;
