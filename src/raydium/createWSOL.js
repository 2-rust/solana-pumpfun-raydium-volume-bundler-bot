import * as spl from '@solana/spl-token';

async function createwSOL(owner) {
    const wSolATA = await spl.getAssociatedTokenAddress(spl.NATIVE_MINT, owner);

    const createWSOLAta = spl.createAssociatedTokenAccountIdempotentInstruction(
        owner,
        wSolATA,
        owner,
        spl.NATIVE_MINT,
        spl.TOKEN_PROGRAM_ID,
        spl.ASSOCIATED_TOKEN_PROGRAM_ID
    ); 
    
    return createWSOLAta;
}

export default createwSOL;