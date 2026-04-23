/**
 * Format lamports to SOL with 2 decimal places.
 */
export function solFmt(lamports: number): string {
  return (lamports / 1e9).toFixed(2);
}

/**
 * Format a unix timestamp to locale date string.
 */
export function dateFmt(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

/**
 * Parsed bet account data from raw on-chain bytes.
 */
export interface BetAccountData {
  side: 'rug' | 'legit';
  amount: number;
  claimed: boolean;
}

/**
 * Parse a UserBet account from raw account data buffer.
 *
 * Layout (after 8-byte discriminator):
 *   [0..32]  user pubkey
 *   [32..64] market pubkey
 *   [64]     side (0=rug, 1=legit)
 *   [65..73] amount (u64 LE)
 *   [73..81] placed_at (i64 LE)
 *   [81]     claimed (bool)
 */
export function parseBetAccount(data: Buffer): BetAccountData | null {
  try {
    if (data.length < 90) return null;
    const sideByte = data[72];
    const amount = Number(data.readBigUInt64LE(73));
    const claimed = data[89] === 1;
    return {
      side: sideByte === 0 ? 'rug' : 'legit',
      amount,
      claimed,
    };
  } catch {
    return null;
  }
}
