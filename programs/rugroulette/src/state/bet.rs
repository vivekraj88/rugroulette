use anchor_lang::prelude::*;

/// Which side of the prediction the user chose.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq, InitSpace)]
pub enum BetSide {
    Rug,
    Legit,
}

/// A single user's bet on a prediction market.
/// One bet per user per market (PDA ensures uniqueness).
#[account]
#[derive(InitSpace)]
pub struct UserBet {
    /// The bettor's wallet
    pub user: Pubkey,
    /// The market this bet belongs to
    pub market: Pubkey,
    /// RUG or LEGIT
    pub side: BetSide,
    /// Bet amount in lamports
    pub amount: u64,
    /// Unix timestamp when bet was placed
    pub placed_at: i64,
    /// Whether winnings have been claimed
    pub claimed: bool,
    /// PDA bump seed
    pub bump: u8,
}
