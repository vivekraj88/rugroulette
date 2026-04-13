use anchor_lang::prelude::*;

declare_id!("3AKQmuMpZAMUiKm4pRw1BXFaUzFhx65Pi5XSBoBvkomC");

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::BetSide;
use state::ResolutionData;

#[program]
pub mod rugroulette {
    use super::*;

    /// Initialize the prediction market factory.
    pub fn initialize_factory(
        ctx: Context<InitializeFactory>,
        market_fee_bps: u16,
        min_bet: u64,
    ) -> Result<()> {
        instructions::initialize_factory::handler(ctx, market_fee_bps, min_bet)
    }

    /// Create a new market for token prediction.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        token_mint: Pubkey,
        token_name: String,
        ai_score: u8,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, token_mint, token_name, ai_score)
    }

    /// Place a bet on whether a token is a rug pull.
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        side: BetSide,
        amount: u64,
    ) -> Result<()> {
        instructions::place_bet::handler(ctx, side, amount)
    }

    /// Resolve a market with the final outcome.
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        result: bool,
        data: ResolutionData,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx, result, data)
    }

    /// Claim winnings from a correctly predicted market.
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    /// Cancel an unresolved market and enable refunds.
    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        instructions::cancel_market::handler(ctx)
    }

    /// Update the AI-generated rug score for a market.
    pub fn update_ai_score(ctx: Context<UpdateAiScore>, new_score: u8) -> Result<()> {
        instructions::update_ai_score::handler(ctx, new_score)
    }

    /// Claim a refund from a cancelled market.
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund::handler(ctx)
    }
}
