/// PDA seeds for the market factory singleton.
pub const FACTORY_SEED: &[u8] = b"factory";

/// PDA seeds prefix for individual prediction markets.
pub const MARKET_SEED: &[u8] = b"market";

/// PDA seeds prefix for user bets.
pub const BET_SEED: &[u8] = b"bet";

/// PDA seeds prefix for user profiles.
pub const PROFILE_SEED: &[u8] = b"profile";

/// Default market fee in basis points (3%).
pub const DEFAULT_FEE_BPS: u16 = 300;

/// Default auto-resolution period in days.
pub const DEFAULT_RESOLVE_DAYS: u8 = 7;

/// Seconds in one day (used for resolve_at calculation).
pub const SECONDS_PER_DAY: i64 = 86_400;
