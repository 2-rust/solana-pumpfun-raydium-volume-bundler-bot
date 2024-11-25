import axios from 'axios';

async function getBundleResults(bundleID) {
    const url = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';

    const data = {
        jsonrpc: "2.0",
        id: 1,
        method: "getInflightBundleStatuses",
        params: [[bundleID]]
    };

    const checkStatus = async () => {
        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const bundle = response.data.result.value[0];
            console.log(`Current status for bundle ${bundleID}: ${bundle.status}`);

            if (bundle.status !== 'Pending') {
                return bundle.status;
            }

            return null;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    };

    while (true) {
        const status = await checkStatus();
        if (status) {
            console.log(`Final status for bundle ${bundleID}: ${status}`);
            return status;
        }
        await new Promise(resolve => setTimeout(resolve, 2500));
    }
}

export default getBundleResults;