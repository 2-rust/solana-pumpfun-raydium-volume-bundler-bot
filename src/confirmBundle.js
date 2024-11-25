import { Connection, VersionedTransaction } from '@solana/web3.js';
import { SearcherClient } from 'jito-ts/dist/sdk/block-engine/searcher.js';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types.js';
import bs58 from "bs58";
import chalk from "chalk";


export const onBundleResult = (c, targetBundleId) => {
    return new Promise((resolve) => {
        let state = 0;
        let isResolved = false;
        

        // Bundle result listener
        const listener = c.onBundleResult(
            (result) => {
                if (isResolved) return state;

                const bundleId = result.bundleId;
                const isAccepted = result.accepted;
                const isRejected = result.rejected;

                if (targetBundleId !== bundleId) { return; }

                if (!isResolved) {
                    if (isAccepted) {
                        console.log(
                            chalk.blue(
                                "bundle accepted, ID:",
                                chalk.whiteBright.bold(bundleId),
                                " Slot: ",
                                chalk.blueBright.bold(result?.accepted?.slot)
                            )
                        );
                        state += 1;
                        isResolved = true;
                        resolve([state, listener, 0]); // Resolve with 'first' when a bundle is accepted
                        return;
                    }

                    if (isRejected) {
                        console.log(chalk.red('Failed to send Bundle.'));
                        isResolved = true;

                        if (isRejected.simulationFailure) {
                            if (isRejected.simulationFailure.msg?.toLowerCase().includes('partially') || isRejected.simulationFailure.msg?.toLowerCase().includes('been processed')) {
                                resolve([1, listener, 0]);
                                return;
                            }
                            const details = isRejected.simulationFailure.msg ?? '';
                            console.log(chalk.gray(details));
                        }

                        if (isRejected.internalError) {
                            if (isRejected.internalError.msg?.toLowerCase().includes('partially')) {
                                resolve([1, listener, 0]);
                                return;
                            }
                            const details = isRejected.internalError.msg ?? '';
                            console.log(chalk.gray(details));
                        }

                        if (isRejected.stateAuctionBidRejected) {
                            if (isRejected.stateAuctionBidRejected.msg?.toLowerCase().includes('partially')) {
                                resolve([1, listener, 0]);
                                return;
                            }
                            const details = isRejected.stateAuctionBidRejected.msg ?? '';
                            console.log(chalk.gray(details));
                        }

                        if (isRejected.droppedBundle) {
                            if (isRejected.droppedBundle.msg?.toLowerCase().includes('partially') || isRejected.droppedBundle.msg?.toLowerCase().includes('been processed')) {
                                resolve([1, listener, 0]);
                                return;
                            }
                            const details = isRejected.droppedBundle.msg ?? '';
                            console.log(chalk.gray(details));
                        }

                        if (isRejected.winningBatchBidRejected) {
                            if (isRejected.winningBatchBidRejected.msg?.toLowerCase().includes('partially')) {
                                resolve([1, listener, 0]);
                                return;
                            }
                            const details = isRejected.winningBatchBidRejected.msg ?? '';
                            console.log(chalk.gray(details));
                        }
                        resolve([state, listener, 0]);
                    }
                }
            },
            (e) => {
                console.log('error in bundle sub', e);
                resolve([state, listener, 0]);
            }
        );

        setTimeout(() => {
            resolve([state, listener, 1]);
            isResolved = true;
        }, 40000);
    });
};
