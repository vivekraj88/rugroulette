import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || '3AKQmuMpZAMUiKm4pRw1BXFaUzFhx65Pi5XSBoBvkomC'
);

export const FACTORY_SEED = new TextEncoder().encode('factory');
export const MARKET_SEED = new TextEncoder().encode('market');
export const BET_SEED = new TextEncoder().encode('bet');
export const PROFILE_SEED = new TextEncoder().encode('profile');
