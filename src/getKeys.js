import { PublicKey } from "@solana/web3.js";
import { encode } from "@coral-xyz/anchor/dist/cjs/utils/bytes/utf8";

export function getBondingCurve(mint, programId,) {
    const [pda, _] = PublicKey.findProgramAddressSync(
        [
            encode("bonding-curve"),
            mint.toBuffer(),
        ],
        programId,
    )
    return pda
}