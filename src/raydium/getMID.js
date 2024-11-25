import axios from 'axios';

async function getMarket(mint) {
    const url = `https://frontend-api.pump.fun/coins/${mint}`;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    let marketID = '';
    let poolID = '';

    try {
        const response = await axios.get(url, { headers });
        const data = response.data;

        marketID = data.market_id;
        poolID = data.raydium_pool;

    } catch (error) {
        console.log("Error fetching market data, retrying in 1.5 seconds.", error);
        await new Promise(resolve => setTimeout(resolve, 1500));
        await getMarket();
    }

    return { marketID, poolID };
}
export default getMarket;
