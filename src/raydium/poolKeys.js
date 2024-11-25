import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { Market } from '@openbook-dex/openbook';
import loadConfig from '../loadConfig.js';

async function poolKeys(marketID) {
    const config = await loadConfig();
    const rpc = config.rpcURL;
    const ws = config.wsURL;

    const rayV4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
    const Amm_Authority = new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1');
    const openbookProgram = new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX');
    const serumProgramId = new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');

    const withdrawQueue = SystemProgram.programId;
    const lpVault = SystemProgram.programId;

    const baseDecimal = 9;
    const quoteDecimal = 6;
    const rayVersion = 4;

    async function getMarketInfo(marketID) {
        const connection = new Connection(rpc, {
            wsEndpoint: ws,
            commitment: 'confirmed'
        });
        let marketInfo = null;
        while (true) {
            marketInfo = await connection.getAccountInfo(marketID);
            if (marketInfo) {
                break;
            }
        }
        return marketInfo;
    }

    function getDecodedData(marketInfo) {
        const decodedData = Market.getLayout(openbookProgram).decode(marketInfo.data);
        return decodedData;
    }

    const marketInfo = await getMarketInfo(marketID);
    if (!marketInfo) {
        throw new Error('Failed to fetch market info');
    }
    const marketDeco = getDecodedData(marketInfo);

    function getVaultSigner(marketId, marketDeco) {
        const seeds = [marketId.toBuffer()];
        const seedsWithNonce = seeds.concat(Buffer.from([Number(marketDeco.vaultSignerNonce.toString())]), Buffer.alloc(7));
        return PublicKey.createProgramAddressSync(seedsWithNonce, openbookProgram);
    }

    function getLPMint(marketId) {
        const seeds = [rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('lp_mint_associated_seed', 'utf-8')];
        return PublicKey.findProgramAddressSync(seeds, rayV4)[0];
    }

    function getPoolID(marketId) {
        const seeds = [rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('amm_associated_seed', 'utf-8')];
        return PublicKey.findProgramAddressSync(seeds, rayV4)[0];
    }

    function getOpenOrders(marketId) {
        const seeds = [rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('open_order_associated_seed', 'utf-8')];
        return PublicKey.findProgramAddressSync(seeds, rayV4)[0];
    }

    function getTargetOrders(marketId) {
        const seeds = [rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('target_associated_seed', 'utf-8')];
        return PublicKey.findProgramAddressSync(seeds, rayV4)[0];
    }

    function getBaseVault(marketId) {
        const seeds = [rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('coin_vault_associated_seed', 'utf-8')];
        return PublicKey.findProgramAddressSync(seeds, rayV4)[0];
    }

    function getQuoteVault(marketId) {
        const seeds = [rayV4.toBuffer(), marketId.toBuffer(), Buffer.from('pc_vault_associated_seed', 'utf-8')];
        return PublicKey.findProgramAddressSync(seeds, rayV4)[0];
    }

    let quoteVault = getQuoteVault(marketID);
    let baseVault = getBaseVault(marketID);
    let targetOrders = getTargetOrders(marketID);
    let openOrders = getOpenOrders(marketID);
    let poolID = getPoolID(marketID);
    let lpMint = getLPMint(marketID);
    let vaultSigner = getVaultSigner(marketID, marketDeco);

    quoteVault = quoteVault;
    baseVault = baseVault;
    targetOrders = targetOrders;
    openOrders = openOrders;
    poolID = poolID;
    lpMint = lpMint;
    vaultSigner = vaultSigner;

    const baseMint = marketDeco.baseMint;
    const quoteMint = marketDeco.quoteMint;
    const mrktBaseVault = marketDeco.baseVault;
    const mrktQuoteVault = marketDeco.quoteVault;
    const mrktEventQueue = marketDeco.eventQueue;
    const mrktBids = marketDeco.bids;
    const mrktAsks = marketDeco.asks;

    let lpInfo = {
        poolID,
        baseMint,
        quoteMint,
        lpMint,
        baseDecimal,
        quoteDecimal,
        rayVersion,
        rayV4,
        Amm_Authority,
        openOrders,
        targetOrders,
        baseVault,
        quoteVault,
        withdrawQueue,
        lpVault,
        serumProgramId,
        marketID,
        vaultSigner,
        mrktBaseVault,
        mrktQuoteVault,
        mrktBids,
        mrktAsks,
        mrktEventQueue,
    }
    //console.log(lpInfo);
    return lpInfo;
}

export default poolKeys;
