# Migration Guide: Solana pump.fun → Nad.fun (Monad)

This document outlines the changes made when converting the Solana pump.fun bundler to work with Nad.fun on the Monad network.

## Major Changes

### 1. Network & Blockchain
- **Before**: Solana blockchain using `@solana/web3.js`
- **After**: Monad (EVM-compatible) blockchain using `ethers.js`

### 2. Dependencies
- **Removed**:
  - `@solana/web3.js`
  - `@solana/spl-token`
  - `jito-ts`
  - `@coral-xyz/anchor`
  - `bs58` (replaced with ethers wallet format)
  - All Solana-specific packages

- **Added**:
  - `ethers` (v6) - for EVM blockchain interactions
  - `dotenv` - for environment variables
  - `ws` - for WebSocket connections (future use)

### 3. Wallet System
- **Before**: Solana keypairs (base58 encoded)
- **After**: Ethereum-style wallets (hex-encoded private keys)
- **Format**: `address:0x...privatekey` instead of `pubkey:base58secret`

### 4. Transaction Bundling
- **Before**: JITO bundles (Solana-specific MEV protection)
- **After**: Sequential transaction bundling with nonce management
- **Note**: JITO doesn't exist on Monad, so we use sequential execution with proper nonce handling

### 5. Token Standard
- **Before**: SPL tokens
- **After**: ERC-20 tokens

### 6. Native Token
- **Before**: SOL
- **After**: MON (native token on Monad)

### 7. Contract Addresses
All contract addresses updated to Nad.fun contracts on Monad:
- Bonding Curve Router: `0x6F6B8F1a20703309951a5127c45B49b1CD981A22`
- Bonding Curve: `0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE`
- DEX Router: `0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137`
- DEX Factory: `0x6B5F564339DbAD6b780249827f2198a841FEB7F3`
- WMON: `0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A`
- Lens: `0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea`

## File Structure Changes

### New Files
- `src/nadfun/` - Directory for Nad.fun-specific modules
  - `constants.js` - Contract addresses and utility functions
  - `abis.js` - Contract ABIs
  - `buy.js` - Buy functions for bonding curve
  - `sell.js` - Sell functions for bonding curve
  - `bundle.js` - Transaction bundling logic
  - `handleCreatorTokens.js` - Handle creator token percentage issue
- `src/nadfunBuy.js` - Main buy bundler
- `src/nadfunSell.js` - Main sell bundler
- `src/nadfunHumanMode.js` - Human-like trading mode
- `src/nadfunSingleSell.js` - Single wallet sell
- `src/nadfunCleanup.js` - Cleanup mode
- `src/nadfunWalletMonitor.js` - Wallet monitoring
- `src/loadConfig.js` - Configuration loader
- `src/loadWallets.js` - Wallet loader for EVM
- `src/checkBalances.js` - Balance checker
- `src/transferMON.js` - MON transfer utilities
- `config.example.json` - Example configuration file

### Removed/Replaced Files
- Solana-specific modules replaced with EVM equivalents
- JITO-related code removed
- SPL token handling replaced with ERC-20

### Updated Files
- `main.js` - Updated menu system for Nad.fun
- `package.json` - Updated dependencies
- `config.json` - Updated for Monad network
- `README.md` - Complete rewrite for Nad.fun

## Key Features Implemented

### 1. Bonding Curve Trading
- Buy tokens on Nad.fun bonding curve
- Sell tokens back to bonding curve
- Quote calculation with slippage protection
- Token listing verification

### 2. Transaction Bundling
- Sequential transaction execution
- Proper nonce management per wallet
- Retry logic with exponential backoff
- Error handling and reporting

### 3. Wallet Management
- Generate Ethereum-style wallets
- Load wallets from `wallets.txt`
- Check MON and token balances
- Transfer MON between wallets

### 4. Creator Token Handling
- Functions to handle creator token percentage
- Buy tokens from bonding curve to reduce creator percentage

## Configuration Changes

### config.json Structure
```json
{
    "rpc": "Monad RPC URL",
    "chainId": 10143,
    "slippage": 0.05,
    "sender": "0x...privatekey",
    "contracts": { ... }
}
```

### Important Notes
- Private keys are now hex-encoded (with or without 0x prefix)
- Gas settings (gasPrice, gasLimit) added
- Chain ID required (10143 for testnet)
- JITO settings removed

## Usage Differences

### Before (Solana)
```javascript
// Solana transaction
const transaction = new Transaction();
transaction.add(instruction);
await sendAndConfirmTransaction(connection, transaction, [keypair]);
```

### After (Monad/EVM)
```javascript
// EVM transaction
const tx = await contract.buy(tokenAddress, to, amountIn, amountOutMin, deadline, {
    value: amountIn,
    gasLimit: 300000
});
await tx.wait();
```

## Testing Recommendations

1. **Testnet First**: Always test on Monad testnet before mainnet
2. **Small Amounts**: Start with small transaction amounts
3. **Gas Monitoring**: Monitor gas prices and adjust accordingly
4. **Wallet Testing**: Test wallet generation and loading
5. **Transaction Bundling**: Test bundling with a small number of wallets first

## Known Limitations

1. **No JITO**: Sequential bundling instead of parallel bundles
2. **Gas Costs**: EVM transactions require gas fees (MON)
3. **Network Differences**: Some Solana-specific features don't translate directly
4. **WebSocket Monitoring**: Wallet monitoring feature simplified (full implementation pending)

## Future Enhancements

1. Full WebSocket-based wallet monitoring
2. Automatic token detection for cleanup mode
3. DEX integration for graduated tokens
4. Multi-call contract interactions for better gas efficiency
5. Transaction simulation before execution

## Breaking Changes

- Wallet format completely different (can't use Solana wallets)
- All transaction logic rewritten for EVM
- Menu options simplified (some advanced features removed)
- Configuration format changed

## Migration Steps

1. **Backup**: Backup your existing Solana wallets (they won't work)
2. **Update Config**: Copy `config.example.json` to `config.json` and configure
3. **Install Dependencies**: Run `npm install`
4. **Generate Wallets**: Use the bot to generate new EVM wallets
5. **Fund Wallets**: Transfer MON to your wallets
6. **Test**: Start with testnet and small amounts

## Support

For issues or questions about the migration, refer to:
- Nad.fun documentation
- Monad network documentation
- Ethers.js documentation (v6)

---

**Note**: This is a complete rewrite for EVM compatibility. The core logic and user experience remain similar, but the underlying implementation is fundamentally different.
