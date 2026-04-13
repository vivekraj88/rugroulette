use anchor_lang::prelude::*;

/// Global factory configuration for managing prediction markets.
/// Created once by the admin; stores fee structure and resolution rules.
#[account]
#[derive(InitSpace)]
pub struct MarketFactory {
    /// Admin authority that can create/cancel markets
    pub authority: Pubkey,
    /// Total number of markets ever created
    pub total_markets: u64,
    /// Fee in basis points taken from resolved markets (300 = 3%)
    pub market_fee_bps: u16,
    /// Minimum bet amount in lamports
    pub min_bet: u64,
    /// Treasury account that receives collected fees
    pub treasury: Pubkey,
    /// Number of days until a market auto-resolves (default: 7)
    pub auto_resolve_days: u8,
    /// PDA bump seed
    pub bump: u8,
}
