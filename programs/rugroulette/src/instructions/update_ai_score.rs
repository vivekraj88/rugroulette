use anchor_lang::prelude::*;

use crate::constants::FACTORY_SEED;
use crate::errors::RugError;
use crate::state::{MarketFactory, MarketStatus, PredictionMarket};

#[derive(Accounts)]
pub struct UpdateAiScore<'info> {
    #[account(
        seeds = [FACTORY_SEED],
        bump = factory.bump,
        constraint = factory.authority == authority.key() @ RugError::Unauthorized,
    )]
    pub factory: Account<'info, MarketFactory>,

    #[account(
        mut,
        seeds = [crate::constants::MARKET_SEED, market.token_mint.as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Open @ RugError::MarketAlreadyResolved,
    )]
    pub market: Account<'info, PredictionMarket>,

    pub authority: Signer<'info>,
}

/// Updates the AI-generated rug probability score for an open market.
/// Called by the crank after running Claude API analysis on the token.
pub fn handle_update_ai_score(ctx: Context<UpdateAiScore>, new_score: u8) -> Result<()> {
    require!(new_score <= 100, RugError::InvalidAiScore);

    let market = &mut ctx.accounts.market;
    let old_score = market.ai_score;
    market.ai_score = new_score;

    msg!(
        "ai score updated: {} -> {} for market {}",
        old_score,
        new_score,
        market.token_mint
    );
    Ok(())
}
