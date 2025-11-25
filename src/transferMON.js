import { ethers } from 'ethers';
import chalk from 'chalk';
import loadConfig from './loadConfig.js';
import loadWallets from './loadWallets.js';
import { formatMon, parseMon } from './nadfun/constants.js';

/**
 * Distribute MON from main wallet to all sub-wallets
 */
export default async function distro(amountPerWallet = null) {
    
    
    const successCount = results.filter(r => r.success).length;
    console.log(chalk.green(`\n✓ Successfully distributed to ${successCount}/${wallets.length} wallets`));
    
    return results;
}

/**
 * Refund MON from sub-wallets back to main wallet
 */
export async function refund() {
    
    
    const successCount = results.filter(r => r.success).length;
    const totalRefunded = results.filter(r => r.success).reduce((sum, r) => sum + (r.amount || 0n), 0n);
    
    console.log(chalk.green(`\n✓ Successfully refunded ${formatMon(totalRefunded)} MON from ${successCount}/${wallets.length} wallets`));
    
    return results;
}
