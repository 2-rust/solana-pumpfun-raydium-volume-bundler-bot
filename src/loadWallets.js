import fs from 'fs';

async function loadWallets() {
    const rawData = fs.readFileSync("./wallets.txt", "utf8");
    const lines = rawData.split(/[\r\n]+/).filter(line => line.trim() !== '');
    let wallets = [];

    // Process each line
    lines.forEach(line => {
        // Remove all whitespace and hidden characters
        const cleanLine = line.replace(/\s+/g, '');
        const parts = cleanLine.split(':');
        if (parts.length === 2) {
            const [publicKey, privateKey] = parts;
            wallets.push({ pubKey: publicKey, privKey: privateKey });
        }
    });

    return wallets;
}

export default loadWallets;