import { PublicKey, Keypair, Connection, TransactionMessage, VersionedTransaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createCloseAccountInstruction } from '@solana/spl-token';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types.js';
import loadWallets from './loadWallets.js';
import loadConfig from './loadConfig.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import sendBundle from './sendBundle.js';

async function closeAccounts() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const blockEngineURL = config.blockEngineURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const wallets = await loadWallets();
    const batchSize = 5;
    const loops = Math.ceil(wallets.length / batchSize);

    for (let i = 0; i < loops; i++) {
        const start = i * batchSize;
        const end = start + batchSize;
        const batchWallets = wallets.slice(start, end);

        const transactions = [];
        const signers = [];
        for (const wallet of batchWallets) {
            try {
                console.log(chalk.green(`Processing wallet: ${wallet.pubKey}\n`));
                const walletAddress = new PublicKey(wallet.pubKey);
                const payer = Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallet.privKey)));

                const tokenAccounts = await connection.getTokenAccountsByOwner(walletAddress, {
                    programId: TOKEN_PROGRAM_ID,
                });

                if (tokenAccounts.value.length === 0) {
                    console.log(chalk.red(`No token accounts found for wallet: ${wallet.pubKey}`));
                    continue;
                }

                console.log(chalk.green(`Found ${tokenAccounts.value.length} token accounts for wallet: ${wallet.pubKey}`));

                const tokenAccountPubkeys = tokenAccounts.value.map(account => account.pubkey);
                let fullTX;

                if (wallet === batchWallets[batchWallets.length - 1]) {
                    fullTX = await createCloseWithTip(tokenAccountPubkeys, walletAddress, payer, connection);
                    transactions.push(fullTX);
                    signers.push(wallet.privKey);
                } else {
                    fullTX = await createCloseIX(tokenAccountPubkeys, walletAddress, payer, connection);
                    transactions.push(fullTX);
                    signers.push(wallet.privKey);
                }
                
            } catch (error) {
                console.error(chalk.red('Error closing account:', error));
            }
        }

        if (transactions.length === 0) {
            console.log(chalk.yellow("No transactions to process in this batch, skipping bundle creation."));
            continue;
        }

        const search = searcherClient(blockEngineURL);

        const bund = new Bundle([]);
        // break the transaction array into 1 transaction and add it to the bundle
        for (const tx of transactions) {
            bund.addTransactions(tx);
        }

        console.log("Transaction added to bundle");
        console.log("Number of transactions in the bundle:", bund.transactions.length);

        try {
            const sentBundle = await sendBundle(bund, blockEngineURL);
            console.log(`Confirm Bundle Manually (JITO): https://explorer.jito.wtf/bundle/${sentBundle}`);
            console.log("Processing times may be slow...\n");
        } catch (error) {
            if (error.message && error.message.includes("bundle contains an already processed transaction")) {
                console.log("Bundle Landed!");
                return;
            }
            console.error("Error sending bundle:", error);
        }
        await new Promise(r => setTimeout(r, config.delay));
    }
}

async function createCloseIX(tokenAccountPubkeys, walletAddress, payer, connection) {
    const instructions = tokenAccountPubkeys.map(tokenAccountPubkey => {
        const closeIX = createCloseAccountInstruction(
            tokenAccountPubkey,
            walletAddress,
            walletAddress
        );

        return new TransactionInstruction({
            keys: [
                { pubkey: tokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: walletAddress, isSigner: false, isWritable: true },
                { pubkey: payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey), isSigner: true, isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: closeIX.data
        });
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);
    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: instructions,
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    console.log("Created transaction with instructions:", instructions.length); // Debugging line

    return fullTX;
}

async function createCloseWithTip(tokenAccountPubkeys, walletAddress, payer, connection) {
    const config = await loadConfig();
    const jitoTip = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.jitoTip)));
    const jitoTipAmount = config.jitoTipAmount;
    const jitoTipLamports = jitoTipAmount * 1e9;

    const closeInstructions = tokenAccountPubkeys.map(tokenAccountPubkey => {
        const closeIX = createCloseAccountInstruction(
            tokenAccountPubkey,
            walletAddress,
            walletAddress
        );

        return new TransactionInstruction({
            keys: [
                { pubkey: tokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: walletAddress, isSigner: false, isWritable: true },
                { pubkey: payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey), isSigner: true, isWritable: false }
            ],
            programId: TOKEN_PROGRAM_ID,
            data: closeIX.data
        });
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    const jitoTipAccounts = [
        '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
        'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
        'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
        'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
        'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
        'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
        'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
        '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'
    ];

    const pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
    const jitoTipAccount = new PublicKey(jitoTipAccounts[pickAccount]);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    const tipIX = SystemProgram.transfer({
        fromPubkey: jitoTip.publicKey,
        toPubkey: jitoTipAccount,
        lamports: jitoTipLamports
    });

    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [...closeInstructions, tipIX],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer, jitoTip]);

    console.log("Created transaction with instructions and tip:", closeInstructions.length); // Debugging line

    return fullTX;
}

export default closeAccounts;