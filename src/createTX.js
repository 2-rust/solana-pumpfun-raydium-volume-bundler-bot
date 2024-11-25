import { PublicKey, Keypair, Connection, TransactionInstruction, TransactionMessage, VersionedTransaction, SystemProgram, ComputeBudgetProgram, LAMPORTS_PER_SOL, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import calculateBuyAmount from './simulateBuy.js';
import humanBuyAmount from './pumpCalcBuy.js';
import createATA from "./pumpATA.js";
import loadConfig from './loadConfig.js';
import bs58 from 'bs58';

const config = await loadConfig();
const slippage = config.slippage;
const rpc = config.rpcURL;
const ws = config.wsURL;
const jitoTipAmount = config.jitoTipAmount;
const jitoTipLamports = jitoTipAmount * 1e9;
const computeUnitLamports = config.computeUnit;
const computeLimitLamports = config.computeLimit;

async function createTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, slippage) {
    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
    const idkThisOne = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

    const tokenAccount = await createATA(mint.toBase58(), wallet);
    const tokenAccountPubKey = tokenAccount.ata;
    const ataIx = tokenAccount.ataIX;

    const payer = Keypair.fromSecretKey(bs58.decode(wallet.privKey));

    const pubkey = wallet.pubKey;
    const owner = new PublicKey(pubkey.toString());

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey(TOKEN_PROGRAM_ID); // Program
    const account10 = new PublicKey(SYSVAR_RENT_ID);
    const account11 = idkThisOne;
    const account12 = pump;

    function encodeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    function encodeTransaction(amount, maxSolCost) {
        const opcode = Buffer.from([0x66]); // Opcode for 'buy' instruction
        const constantPrefix = Buffer.from('063d1201daebea', 'hex'); // The constant part after opcode

        const encodedAmount = encodeU64(amount);
        const encodedMaxSolCost = encodeU64(maxSolCost);

        const encodedData = Buffer.concat([opcode, constantPrefix, encodedAmount, encodedMaxSolCost]);
        return encodedData;
    }

    const amountData = await calculateBuyAmount(buyAmountLamports);
    let amount = amountData * 10 ** 6;
    amount = amount.toFixed(0);

    let maxSolCost = buyAmountLamports * (1 + slippage);
    maxSolCost = maxSolCost.toFixed();

    const transactionBuffer = encodeTransaction(amount, maxSolCost);
    const swapIn = new TransactionInstruction({
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
        }, {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    return { instructions: [ataIx, swapIn], payer };
}

async function createTXWithTip(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, slippage) {

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
    const idkThisOne = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

    const tokenAccount = await createATA(mint.toBase58(), wallet);
    const tokenAccountPubKey = tokenAccount.ata;
    const ataIx = tokenAccount.ataIX;

    const payer = Keypair.fromSecretKey(bs58.decode(wallet.privKey));

    const pubkey = wallet.pubKey;
    const owner = new PublicKey(pubkey.toString());

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey(TOKEN_PROGRAM_ID); // Program
    const account10 = new PublicKey(SYSVAR_RENT_ID);
    const account11 = idkThisOne;
    const account12 = pump;

    function encodeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    function encodeTransaction(amount, maxSolCost) {
        const opcode = Buffer.from([0x66]); // Opcode for 'buy' instruction
        const constantPrefix = Buffer.from('063d1201daebea', 'hex'); // The constant part after opcode

        const encodedAmount = encodeU64(amount);
        const encodedMaxSolCost = encodeU64(maxSolCost);

        const encodedData = Buffer.concat([opcode, constantPrefix, encodedAmount, encodedMaxSolCost]);
        return encodedData;
    }

    const amountData = await calculateBuyAmount(buyAmountLamports);
    let amount = amountData * 10 ** 6;
    amount = amount.toFixed(0);

    let maxSolCost = buyAmountLamports * (1 + slippage);
    maxSolCost = maxSolCost.toFixed();

    const transactionBuffer = encodeTransaction(amount, maxSolCost);
    const swapIn = new TransactionInstruction({
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
        }, {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        }, {
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
        instructions: [ataIx, swapIn, tipIX],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    // Create VersionedTransaction
    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    // Return TransactionMessage and VersionedTransaction
    return { instructions: [ataIx, swapIn, tipIX], payer };
}

async function createMicroTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, slippage) {

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
    const idkThisOne = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

    const tokenAccount = await createATA(mint.toBase58(), wallet);
    const tokenAccountPubKey = tokenAccount.ata;
    const ataIx = tokenAccount.ataIX;

    const payer = Keypair.fromSecretKey(bs58.decode(wallet.privKey));

    const pubkey = wallet.pubKey;
    const owner = new PublicKey(pubkey.toString());

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve // Writeable
    const account5 = aBondingCurve // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey(TOKEN_PROGRAM_ID); // Program
    const account10 = new PublicKey(SYSVAR_RENT_ID);
    const account11 = idkThisOne;
    const account12 = pump;

    function encodeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    function encodeTransaction(amount, maxSolCost) {
        const opcode = Buffer.from([0x66]); // Opcode for 'buy' instruction
        const constantPrefix = Buffer.from('063d1201daebea', 'hex'); // The constant part after opcode

        // Encoding the amount and maxSolCost
        const encodedAmount = encodeU64(amount);
        const encodedMaxSolCost = encodeU64(maxSolCost);

        // Concatenating all parts: opcode, constantPrefix, encodedAmount, encodedMaxSolCost
        const encodedData = Buffer.concat([opcode, constantPrefix, encodedAmount, encodedMaxSolCost]);
        return encodedData;
    }

    // Example usage:
    const amountData = await calculateBuyAmount(buyAmountLamports);
    let amount = amountData * 1e6;
    amount = amount.toFixed(0);

    let maxSolCost = buyAmountLamports * (1 + slippage);
    maxSolCost = maxSolCost.toFixed();

    let computePriceIx = (ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitLamports }));
    let computeLimitIx = (ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimitLamports }));


    const transactionBuffer = encodeTransaction(amount, maxSolCost);
    const swapIn = new TransactionInstruction({
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
        }, {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    // Create TransactionMessage
    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [computeLimitIx, computePriceIx, ataIx, swapIn],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    // Create VersionedTransaction
    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    // Return TransactionMessage and VersionedTransaction
    return fullTX;
}

async function createHumanTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports) {
    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
    const idkThisOne = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

    const tokenAccount = await createATA(mint.toBase58(), wallet);
    const tokenAccountPubKey = tokenAccount.ata;
    const ataIx = tokenAccount.ataIX;

    const payer = Keypair.fromSecretKey(bs58.decode(wallet.privKey));

    const pubkey = wallet.pubKey;
    const owner = new PublicKey(pubkey.toString());

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey(TOKEN_PROGRAM_ID); // Program
    const account10 = new PublicKey(SYSVAR_RENT_ID);
    const account11 = idkThisOne;
    const account12 = pump;

    function encodeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    function encodeTransaction(amount, maxSolCost) {
        const opcode = Buffer.from([0x66]); // Opcode for 'buy' instruction
        const constantPrefix = Buffer.from('063d1201daebea', 'hex'); // The constant part after opcode

        const encodedAmount = encodeU64(amount);
        const encodedMaxSolCost = encodeU64(maxSolCost);

        const encodedData = Buffer.concat([opcode, constantPrefix, encodedAmount, encodedMaxSolCost]);
        return encodedData;
    }

    let maxSolCost = buyAmountLamports * (1 + slippage);
    maxSolCost = maxSolCost.toFixed();

    const amountData = await humanBuyAmount(bondingCurve, buyAmountLamports);
    let amount = amountData * 10 ** 6;
    amount = amount.toFixed(0);

    const transactionBuffer = encodeTransaction(amount, maxSolCost);
    const swapIn = new TransactionInstruction({
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
        }, {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    let computePriceIx = (ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitLamports }));
    let computeLimitIx = (ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimitLamports }));

    // Create TransactionMessage
    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [computePriceIx, computeLimitIx, ataIx, swapIn],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    // Create VersionedTransaction
    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    // Return TransactionMessage and VersionedTransaction
    return fullTX;
}

async function createSameTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports, computeLimit, computeUnit) {
    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
    const idkThisOne = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

    const tokenAccount = await createATA(mint.toBase58(), wallet);
    const tokenAccountPubKey = tokenAccount.ata;
    const ataIX = tokenAccount.ataIX;

    const payer = Keypair.fromSecretKey(bs58.decode(wallet.privKey));

    const pubkey = wallet.pubKey;
    const owner = new PublicKey(pubkey.toString());

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey(TOKEN_PROGRAM_ID); // Program
    const account10 = new PublicKey(SYSVAR_RENT_ID);
    const account11 = idkThisOne;
    const account12 = pump;

    function encodeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    function encodeTransaction(amount, maxSolCost) {
        const opcode = Buffer.from([0x66]);
        const constantPrefix = Buffer.from('063d1201daebea', 'hex');

        // Ensure both values are BigInt
        const amountBig = BigInt(amount);
        const maxSolCostBig = BigInt(maxSolCost);

        const encodedAmount = encodeU64(amountBig);
        const encodedMaxSolCost = encodeU64(maxSolCostBig);

        return Buffer.concat([opcode, constantPrefix, encodedAmount, encodedMaxSolCost]);
    }

    const amountData = await humanBuyAmount(bondingCurve, buyAmountLamports);
    let amount = amountData * 1e6;
    amount = Math.floor(amount);

    let maxSolCost = buyAmountLamports * (1 + slippage);
    maxSolCost = Math.floor(maxSolCost);

    const transactionBuffer = encodeTransaction(amount, maxSolCost);
    const swapIn = new TransactionInstruction({
        programId: pump,
        keys: [
            { pubkey: account1, isSigner: false, isWritable: false },
            { pubkey: account2, isSigner: false, isWritable: true },
            { pubkey: account3, isSigner: false, isWritable: false },
            { pubkey: account4, isSigner: false, isWritable: true },
            { pubkey: account5, isSigner: false, isWritable: true },
            { pubkey: account6, isSigner: false, isWritable: true },
            { pubkey: account7, isSigner: true, isWritable: true, isPayer: true },
            { pubkey: account8, isSigner: false, isWritable: false },
            { pubkey: account9, isSigner: false, isWritable: false },
            { pubkey: account10, isSigner: false, isWritable: false },
            { pubkey: account11, isSigner: false, isWritable: false },
            { pubkey: account12, isSigner: false, isWritable: false }
        ],
        data: transactionBuffer
    });

    let computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnit });
    let computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimit });

    return { instructions: [computePriceIx, computeLimitIx, ataIX, swapIn], payer: payer, amt: amount };
}

async function warmupTX(mint, bondingCurve, aBondingCurve, pump, wallet, buyAmountLamports) {
    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const SYSTEM_PROGAM_ID = "11111111111111111111111111111111";
    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
    const SYSVAR_RENT_ID = "SysvarRent111111111111111111111111111111111";
    const global = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const feeRecipient = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
    const idkThisOne = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");

    const tokenAccount = await createATA(mint.toBase58(), wallet);
    const tokenAccountPubKey = tokenAccount.ata;
    const ataIx = tokenAccount.ataIX;

    const payer = Keypair.fromSecretKey(bs58.decode(wallet.privKey));

    const pubkey = wallet.pubKey;
    const owner = new PublicKey(pubkey.toString());

    const account1 = global;
    const account2 = feeRecipient; // Writeable
    const account3 = mint;
    const account4 = bondingCurve; // Writeable
    const account5 = aBondingCurve; // Writeable
    const account6 = new PublicKey(tokenAccountPubKey); // Writeable
    const account7 = owner; // Writeable & Signer & Fee Payer
    const account8 = new PublicKey(SYSTEM_PROGAM_ID); // Program
    const account9 = new PublicKey(TOKEN_PROGRAM_ID); // Program
    const account10 = new PublicKey(SYSVAR_RENT_ID);
    const account11 = idkThisOne;
    const account12 = pump;

    function encodeU64(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(value), 0);
        return buffer;
    }

    function encodeTransaction(amount, maxSolCost) {
        const opcode = Buffer.from([0x66]); // Opcode for 'buy' instruction
        const constantPrefix = Buffer.from('063d1201daebea', 'hex'); // The constant part after opcode

        const encodedAmount = encodeU64(amount);
        const encodedMaxSolCost = encodeU64(maxSolCost);

        const encodedData = Buffer.concat([opcode, constantPrefix, encodedAmount, encodedMaxSolCost]);
        return encodedData;
    }

    let maxSolCost = buyAmountLamports * (1 + slippage);
    maxSolCost = maxSolCost.toFixed();
    
    const amountData = await humanBuyAmount(bondingCurve, buyAmountLamports);
    let amount = amountData * 10 ** 6;
    amount = amount.toFixed(0);

    const transactionBuffer = encodeTransaction(amount, maxSolCost);
    const swapIn = new TransactionInstruction({
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
        }, {
            pubkey: account11,
            isSigner: false,
            isWritable: false
        }, {
            pubkey: account12,
            isSigner: false,
            isWritable: false
        }],
        data: transactionBuffer
    });

    const payerKey = payer.publicKey instanceof PublicKey ? payer.publicKey : new PublicKey(payer.publicKey);

    const blockhashObj = await connection.getLatestBlockhash('finalized');
    const recentBlockhash = blockhashObj.blockhash;

    let computePriceIx = (ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitLamports }));
    let computeLimitIx = (ComputeBudgetProgram.setComputeUnitLimit({ units: computeLimitLamports }));

    // Create TransactionMessage
    const messageV0 = new TransactionMessage({
        payerKey: payerKey,
        instructions: [computePriceIx, computeLimitIx, ataIx, swapIn],
        recentBlockhash: recentBlockhash
    }).compileToV0Message();

    // Create VersionedTransaction
    const fullTX = new VersionedTransaction(messageV0);
    fullTX.sign([payer]);

    // Return VersionedTransaction
    return fullTX;
}

export { createTX, createTXWithTip, createMicroTX, createHumanTX, createSameTX, warmupTX };