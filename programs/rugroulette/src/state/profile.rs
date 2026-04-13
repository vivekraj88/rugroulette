use anchor_lang::prelude::*;

/// Aggregated statistics for a single user across all markets.
/// Used for leaderboard ranking and streak tracking.
#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    /// The user's wallet
    pub user: Pubkey,
    /// Total number of bets placed
    pub total_bets: u64,
    /// Number of correctly predicted outcomes
    pub correct_predictions: u64,
    /// Total SOL volume wagered (lamports)
    pub total_volume: u64,
    /// Current consecutive correct predictions
    pub current_streak: u16,
    /// All-time best streak
    pub best_streak: u16,
    /// Net earnings in lamports
    pub earnings: u64,
    /// PDA bump seed
    pub bump: u8,
}
