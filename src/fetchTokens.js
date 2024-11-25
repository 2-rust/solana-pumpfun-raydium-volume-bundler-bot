import { Connection, PublicKey } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import loadConfig from './loadConfig.js';

async function fetchTokens(walletPubKey) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const connection = new Connection(rpc, {
        commitment: 'confirmed',
        wsEndpoint: ws
    });

    const filters = [
        {
            dataSize: 165,    //size of account (bytes)
        },
        {
            memcmp: {
                offset: 32,     //location of our query in the account (bytes)
                bytes: walletPubKey,  //our search criteria, a base58 encoded string
            },
        }
    ];

    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID,
        { filters: filters }
    );

    let tokenData = [];

    accounts.forEach((account) => {
        const parsedAccountInfo = account.account.data;
        const decimals = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["decimals"];
        const mintAddress = parsedAccountInfo["parsed"]["info"]["mint"];
        const tokenBalance = parsedAccountInfo["parsed"]["info"]["tokenAmount"]["uiAmount"];

        const mintToken = new PublicKey(mintAddress);
        const owner = new PublicKey(walletPubKey);

        if (decimals === 6 && tokenBalance > 1) {
            const associatedToken = getAssociatedTokenAddressSync(mintToken, owner, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
            const ATA = associatedToken.toBase58();
            tokenData.push({
                CA: mintAddress,
                balance: tokenBalance,
                ATA: ATA
            });
        }
    });

    return tokenData;
}
export default fetchTokens;