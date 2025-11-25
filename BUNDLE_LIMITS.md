# Bundle Limits & Recommendations

## Current Implementation

**By default, there is NO hard limit** on the number of wallets that can be included in a bundle. The bot will process ALL wallets in your `wallets.txt` file.

## Bundle Size Recommendations

### Small Bundles (5-10 wallets)
- ✅ **Best for**: Quick volume, testing, small tokens
- ✅ **Pros**: Fast execution, low gas costs, less noticeable
- ⚠️ **Time**: ~25-50 seconds (with 5s delay)

### Medium Bundles (10-50 wallets)
- ✅ **Best for**: Normal operations, good balance
- ✅ **Pros**: Good volume generation, manageable execution time
- ⚠️ **Time**: ~50-250 seconds (with 5s delay)

### Large Bundles (50+ wallets)
- ⚠️ **Best for**: High volume requirements
- ⚠️ **Pros**: Maximum volume generation
- ❌ **Cons**: Long execution time, higher gas costs, more noticeable

## Execution Time Calculation

**Formula**: `wallets × delay = total time`

Examples with default 5s delay:
- 10 wallets = ~50 seconds
- 20 wallets = ~100 seconds (1.7 minutes)
- 50 wallets = ~250 seconds (4.2 minutes)
- 100 wallets = ~500 seconds (8.3 minutes)

## Configuring Bundle Limits

Add to your `config.json`:

```json
{
    "maxWalletsPerBundle": 10
}
```

**Options**:
- `null` or not set = Unlimited (process all wallets)
- `10` = Process maximum 10 wallets per bundle
- `50` = Process maximum 50 wallets per bundle

## Technical Details

### Sequential Execution
Transactions are executed **sequentially** (one after another), not in parallel. This ensures:
- Proper nonce management per wallet
- Reduced network congestion
- Better success rate

### Delay Between Transactions
Default delay: 5000ms (5 seconds)
- Can be adjusted when calling the buy function
- Longer delays = more human-like but slower
- Shorter delays = faster but more noticeable

### Gas Considerations
Each transaction requires gas:
- Estimated gas per buy: ~150,000-300,000 gas
- Cost depends on current gas price
- 10 wallets = 10 transactions = 10x gas costs

## Best Practices

1. **Start Small**: Test with 5-10 wallets first
2. **Monitor Gas**: Check gas prices before large bundles
3. **Adjust Delay**: Increase delay if transactions fail
4. **Split Large Batches**: For 100+ wallets, consider running multiple smaller bundles
5. **Check Balances**: Ensure all wallets have enough MON for gas + buy amount

## Example Usage

### Unlimited (all wallets)
```json
{
    "maxWalletsPerBundle": null
}
```

### Limited to 20 wallets
```json
{
    "maxWalletsPerBundle": 20
}
```

When you run a bundle with 100 wallets but limit set to 20, only the first 20 will be processed.

## Parallel Bundling (Future Enhancement)

There's also an `executeBundleParallel` function that can process transactions in parallel batches (default batch size: 5), but it's not currently used in the main buy function. This could be enabled for faster execution but with higher gas costs and potential nonce conflicts.

---

**Recommendation**: Start with `maxWalletsPerBundle: 10-20` for optimal balance between volume and execution time.

