import { publicKey, u128, u64 } from '@project-serum/borsh'
import { nu64, struct, u8, seq } from 'buffer-layout'


export const AMM_INFO_LAYOUT_V4 = struct([
    u64('status'),
    u64('nonce'),
    u64('orderNum'),
    u64('depth'),
    u64('coinDecimals'),
    u64('pcDecimals'),
    u64('state'),
    u64('resetFlag'),
    u64('minSize'),
    u64('volMaxCutRatio'),
    u64('amountWaveRatio'),
    u64('coinLotSize'),
    u64('pcLotSize'),
    u64('minPriceMultiplier'),
    u64('maxPriceMultiplier'),
    u64('systemDecimalsValue'),
    // Fees
    u64('minSeparateNumerator'),
    u64('minSeparateDenominator'),
    u64('tradeFeeNumerator'),
    u64('tradeFeeDenominator'),
    u64('pnlNumerator'),
    u64('pnlDenominator'),
    u64('swapFeeNumerator'),
    u64('swapFeeDenominator'),
    // OutPutData
    u64('needTakePnlCoin'),
    u64('needTakePnlPc'),
    u64('totalPnlPc'),
    u64('totalPnlCoin'),

    u64('poolOpenTime'),
    u64('punishPcAmount'),
    u64('punishCoinAmount'),
    u64('orderbookToInitTime'),

    u128('swapCoinInAmount'),
    u128('swapPcOutAmount'),
    u64('swapCoin2PcFee'),
    u128('swapPcInAmount'),
    u128('swapCoinOutAmount'),
    u64('swapPc2CoinFee'),

    publicKey('poolCoinTokenAccount'),
    publicKey('poolPcTokenAccount'),
    publicKey('coinMintAddress'),
    publicKey('pcMintAddress'),
    publicKey('lpMintAddress'),
    publicKey('ammOpenOrders'),
    publicKey('serumMarket'),
    publicKey('serumProgramId'),
    publicKey('ammTargetOrders'),
    publicKey('poolWithdrawQueue'),
    publicKey('poolTempLpTokenAccount'),
    publicKey('ammOwner'),
    publicKey('pnlOwner')
])
