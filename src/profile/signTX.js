import bs58 from 'bs58';
import nacl from 'tweetnacl';

async function signAndEncodeSignature(privateKey) {
    const keypair = nacl.sign.keyPair.fromSecretKey(bs58.decode(privateKey));
    const timestamp = Date.now();
    const message = new TextEncoder().encode(`Sign in to pump.fun: ${timestamp}`);
    const signature = nacl.sign.detached(message, keypair.secretKey);
    const encodedSignature = bs58.encode(signature);
    return { timestamp, signature: encodedSignature };
};

export default signAndEncodeSignature;