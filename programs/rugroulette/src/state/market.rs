use anchor_lang::prelude::*;

/// Status of a prediction market lifecycle.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Open,
    Resolved,
    Cancelled,
}

/// On-chain data captured at resolution time.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct ResolutionData {
    pub final_price: u64,
    pub initial_price: u64,
    pub liquidity_removed_pct: u8,
    pub dev_sold: bool,
    pub resolved_by: Pubkey,
}

/// A prediction market for a single token.
/// Users bet RUG or LEGIT; resolved after `resolve_at` timestamp.
#[account]
#[derive(InitSpace)]
pub struct PredictionMarket {
    /// The token mint being evaluated
    pub token_mint: Pubkey,
    /// Display name of the token (max 32 bytes)
    #[max_len(32)]
    pub token_name: String,
    /// Unix timestamp when market was created
    pub created_at: i64,
    /// Unix timestamp when market can be resolved
    pub resolve_at: i64,
    /// Total SOL in the RUG pool (lamports)
    pub total_rug_pool: u64,
    /// Total SOL in the LEGIT pool (lamports)
    pub total_legit_pool: u64,
    /// Number of unique bettors
    pub total_bettors: u32,
    /// AI-generated rug probability score (0-100)
    pub ai_score: u8,
    /// Current market lifecycle status
    pub status: MarketStatus,
    /// Resolution result: true = rug, false = legit, None = unresolved
    pub result: Option<bool>,
    /// Data captured at resolution (price, liquidity, dev activity)
    pub resolution_data: Option<ResolutionData>,
    /// PDA bump seed
    pub bump: u8,
}
