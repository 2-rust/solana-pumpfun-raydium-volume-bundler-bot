import { PublicKey, Keypair, Connection, TransactionInstruction, TransactionMessage, VersionedTransaction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import loadConfig from './loadConfig.js';
import bs58 from 'bs58';

async function createSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const pubkey = wallet.pubKey;
    const secret = wallet.privKey;
    
    const owner = new PublicKey(pubkey.toString());

    const payer = Keypair.fromSecretKey(bs58.decode(secret));

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"); // Program
    const account10 = new PublicKey(TOKEN_PROGRAM_ID);
    const account11 = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
    const account12 = pump; // Program

    const sell = BigInt("12502976635542562355");
    const amount = BigInt(sellAmountLamports);
    const min_sol_output = BigInt(0);

    const integers = [sell, amount, min_sol_output];

    const binary_segments = integers.map(integer => {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(integer);
        return buffer;
    });

    const transactionBuffer = Buffer.concat(binary_segments);

    const swapOut = new TransactionInstruction({
        programId: pump,
        keys: [{
            pubkey: account1,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account2,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account3,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account4,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account5,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account6,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account7,
            isSigner: true,
            isWritable: true,
            isPayer: true
        }, {
            pubkey: account8,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account9,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account10,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [swapOut],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    return { instructions: [swapOut], payer };
}

async function createSellTXWithTip(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const jitoTipAmount = config.jitoTipAmount;
    const jitoTipLamports = jitoTipAmount * 1e9;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const pubkey = wallet.pubKey;
    const secret = wallet.privKey;
    const owner = new PublicKey(pubkey.toString());

    const payer = Keypair.fromSecretKey(bs58.decode(secret));

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve // Writeable
    const account5 = aBondingCurve // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"); // Program
    const account10 = new PublicKey(TOKEN_PROGRAM_ID);
    const account11 = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
    const account12 = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"); // Program

    const sell = BigInt("12502976635542562355");
    const amount = BigInt(sellAmountLamports);
    const min_sol_output = BigInt(0);

    const integers = [sell, amount, min_sol_output];

    const binary_segments = integers.map(integer => {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(integer);
        return buffer;
    });

    const transactionBuffer = Buffer.concat(binary_segments);

    const swapOut = new TransactionInstruction({
        programId: pump,
        keys: [{
            pubkey: account1,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account2,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account3,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account4,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account5,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account6,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account7,
            isSigner: true,
            isWritable: true,
            isPayer: true
        }, {
            pubkey: account8,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account9,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account10,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);
    const jitoTipAccounts = ['96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5', 'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe', 'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY', 'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49', 'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh', 'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt', 'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'];

    let pickAccount = Math.floor(Math.random() * jitoTipAccounts.length);
    let jitoTipAccount = jitoTipAccounts[pickAccount];

    const tipAccount = new PublicKey(jitoTipAccount);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    const tipIX = SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: tipAccount,
        lamports: jitoTipLamports
    });

    // Create TransactionMessage
    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [swapOut, tipIX],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    // Create VersionedTransaction
    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    // Return TransactionMessage and VersionedTransaction
    return { instructions: [swapOut, tipIX], payer };
}

async function humanSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;
    const computeLimit = config.computeLimit;
    const computeUnit = config.computeUnit;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const pubkey = wallet.pubKey;
    const secret = wallet.privKey;
    const owner = new PublicKey(pubkey.toString());

    const payer = Keypair.fromSecretKey(bs58.decode(secret));

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve // Writeable
    const account5 = aBondingCurve // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"); // Program
    const account10 = new PublicKey(TOKEN_PROGRAM_ID);
    const account11 = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
    const account12 = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"); // Program

    const sell = BigInt("12502976635542562355");
    const amount = BigInt(sellAmountLamports);
    const min_sol_output = BigInt(0);

    const integers = [sell, amount, min_sol_output];

    const binary_segments = integers.map(integer => {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(integer);
        return buffer;
    });

    const transactionBuffer = Buffer.concat(binary_segments);

    const swapOut = new TransactionInstruction({
        programId: pump,
        keys: [{
            pubkey: account1,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account2,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account3,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account4,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account5,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account6,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account7,
            isSigner: true,
            isWritable: true,
            isPayer: true
        }, {
            pubkey: account8,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account9,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account10,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    let computePriceIx = (ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnit }));
    let computeLimitIx = (ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit }));

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    // Create TransactionMessage
    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [computePriceIx, computeLimitIx, swapOut],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    // Create VersionedTransaction
    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    // Return TransactionMessage and VersionedTransaction
    return fullTX;
}

async function warmupSellTX(mint, bondingCurve, aBondingCurve, pump, wallet, sellAmountLamports, tokenAccountPubKey) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    let computeUnitLamports = config.computeUnit;

    let computeLimitLamports = config.computeLimit;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const pubkey = wallet.pubKey;
    const secret = wallet.privKey;

    const owner = new PublicKey(pubkey.toString());

    const payer = Keypair.fromSecretKey(bs58.decode(secret));

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"); // Program
    const account10 = new PublicKey(TOKEN_PROGRAM_ID);
    const account11 = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
    const account12 = pump; // Program


    const sell = BigInt("12502976635542562355");
    const amount = BigInt(sellAmountLamports);
    const min_sol_output = BigInt(0);

    const integers = [sell, amount, min_sol_output];

    const binary_segments = integers.map(integer => {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(integer);
        return buffer;
    });

    const transactionBuffer = Buffer.concat(binary_segments);

    const swapOut = new TransactionInstruction({
        programId: pump,
        keys: [{
            pubkey: account1,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account2,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account3,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account4,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account5,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account6,
            isSigner: false,
            isWritable: true
        }, {
            pubkey: account7,
            isSigner: true,
            isWritable: true,
            isPayer: true
        }, {
            pubkey: account8,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account9,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account10,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        },
        {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    
    let computePriceIx = (ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitLamports }));
    let computeLimitIx = (ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimitLamports }));
    
    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [computePriceIx, computeLimitIx, swapOut],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    return fullTX;
}

export { createSellTX, createSellTXWithTip, humanSellTX, warmupSellTX };