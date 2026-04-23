import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, FACTORY_SEED, MARKET_SEED, BET_SEED, PROFILE_SEED } from './constants';

/**
 * Derive the factory PDA.
 */
export function deriveFactoryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([FACTORY_SEED], PROGRAM_ID);
}

/**
 * Derive market PDA from a token mint address.
 */
export function deriveMarketPda(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MARKET_SEED, tokenMint.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive user bet PDA from market PDA and bettor pubkey.
 */
export function deriveBetPda(marketPda: PublicKey, bettor: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BET_SEED, marketPda.toBuffer(), bettor.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Derive user profile PDA from wallet pubkey.
 */
export function deriveProfilePda(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROFILE_SEED, user.toBuffer()],
    PROGRAM_ID
  );
}
