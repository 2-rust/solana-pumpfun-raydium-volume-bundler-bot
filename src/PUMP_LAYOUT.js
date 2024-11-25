class BuyLayout {
    static serialize(amount, maxSolCost) {
        const buffer = Buffer.alloc(16); // Two Int64 values
        buffer.writeBigInt64LE(BigInt(amount), 0);
        buffer.writeBigInt64LE(BigInt(maxSolCost), 8);
        return buffer;
    }
    static deserialize(buffer) {
        return {
            amount: buffer.readBigInt64LE(0),
            maxSolCost: buffer.readBigInt64LE(8)
        };
    }
}

class SellLayout {
    static serialize(amount, minSolOutput) {
        const buffer = Buffer.alloc(16); // Two Int64 values
        buffer.writeBigInt64LE(BigInt(amount), 0);
        buffer.writeBigInt64LE(BigInt(minSolOutput), 8);
        return buffer;
    }
    static deserialize(buffer) {
        return {
            amount: buffer.readBigInt64LE(0),
            minSolOutput: buffer.readBigInt64LE(8)
        };
    }
}
class BondingCurveLayout {
    static serialize(virtualTokenReserves, virtualSolReserves, realTokenReserves, realSolReserves, tokenTotalSupply, complete) {
        const buffer = Buffer.alloc(41); // Five Int64 values and one flag
        buffer.writeBigInt64LE(BigInt(virtualTokenReserves), 0);
        buffer.writeBigInt64LE(BigInt(virtualSolReserves), 8);
        buffer.writeBigInt64LE(BigInt(realTokenReserves), 16);
        buffer.writeBigInt64LE(BigInt(realSolReserves), 24);
        buffer.writeBigInt64LE(BigInt(tokenTotalSupply), 32);
        buffer.writeInt8(complete ? 1 : 0, 40);
        return buffer;
    }
    static deserialize(buffer) {
        return {
            virtualTokenReserves: buffer.readBigInt64LE(0),
            virtualSolReserves: buffer.readBigInt64LE(8),
            realTokenReserves: buffer.readBigInt64LE(16),
            realSolReserves: buffer.readBigInt64LE(24),
            tokenTotalSupply: buffer.readBigInt64LE(32),
            complete: buffer.readInt8(40) !== 0
        };
    }
}

class GlobalLayout {
    static deserialize(buffer) {
        const initialized = buffer.readInt8(0) !== 0;
        const authority = buffer.slice(1, 33);
        const feeRecipient = buffer.slice(33, 65);
        const initialVirtualTokenReserves = buffer.readBigInt64LE(65);
        const initialVirtualSolReserves = buffer.readBigInt64LE(73);
        const initialRealTokenReserves = buffer.readBigInt64LE(81);
        const tokenTotalSupply = buffer.readBigInt64LE(89);
        const feeBasisPoints = buffer.readBigInt64LE(97);
        return {
            initialized,
            authority,
            feeRecipient,
            initialVirtualTokenReserves,
            initialVirtualSolReserves,
            initialRealTokenReserves,
            tokenTotalSupply,
            feeBasisPoints
        };
    }
}
export { BuyLayout, SellLayout, BondingCurveLayout, GlobalLayout };