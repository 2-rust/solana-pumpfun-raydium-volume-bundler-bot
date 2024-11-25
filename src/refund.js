import { PublicKey, Keypair, Connection, SystemProgram, Transaction } from "@solana/web3.js";
import loadConfig from "./loadConfig.js";
import loadWallets from "./loadWallets.js";
import bs58 from "bs58";

const MAX_WALLETS_PER_TX = 9;

async function refund() {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const wallets = await loadWallets();
    const refundToKeypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(config.sender)));
    const refundTo = refundToKeypair.publicKey;

    for (let i = 0; i < wallets.length; i += MAX_WALLETS_PER_TX) {
        const batchWallets = wallets.slice(i, i + MAX_WALLETS_PER_TX);
        const transaction = new Transaction();
        const walletsToSign = [];

        for (const wallet of batchWallets) {
            const balance = await connection.getBalance(new PublicKey(wallet.pubKey));

            if (balance <= 0) {
                console.log(`Wallet ${wallet.pubKey} has no balance, skipping.`);
                continue;
            }

            const transferInstruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(wallet.pubKey),
                toPubkey: refundTo,
                lamports: balance
            });

            transaction.add(transferInstruction);
            walletsToSign.push(wallet);
        }

        if (transaction.instructions.length === 0) {
            console.log("No valid transfers in this batch, moving to next batch.");
            continue;
        }

        const blockhash = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash.blockhash;
        transaction.feePayer = refundTo;

        // Sign the transaction with all the wallets that have instructions
        for (const wallet of walletsToSign) {
            const senderKeypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallet.privKey)));
            transaction.partialSign(senderKeypair);
        }

        // Sign with the refund recipient (fee payer)
        transaction.partialSign(refundToKeypair);

        const rawTransaction = transaction.serialize();

        let signatures = [];

        try {
            const signature = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                preflightCommitment: 'confirmed'
            });

            console.log("Refund transaction sent with signature:", signature);
            signatures.push(signature);
        } catch (error) {
            console.error("Error sending transaction:", error);
        }

        // confirm the transactions in parallel
        await Promise.all(signatures.map(async (signature) => {
            try {
                await connection.confirmTransaction(signature, 'confirmed');
                console.log("Transaction", signature, "confirmed");
            } catch (error) {
                console.error("Error confirming transaction", signature, ":", error);
            }
        }));
    }
}
export default refund;