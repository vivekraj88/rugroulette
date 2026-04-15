use anchor_lang::prelude::*;

use crate::constants::{FACTORY_SEED, MARKET_SEED, SECONDS_PER_DAY};
use crate::errors::RugError;
use crate::state::{MarketFactory, MarketStatus, PredictionMarket};

#[derive(Accounts)]
#[instruction(token_mint: Pubkey)]
pub struct CreateMarket<'info> {
    #[account(
        mut,
        seeds = [FACTORY_SEED],
        bump = factory.bump,
        constraint = factory.authority == authority.key() @ RugError::Unauthorized,
    )]
    pub factory: Account<'info, MarketFactory>,

    #[account(
        init,
        payer = authority,
        space = 8 + PredictionMarket::INIT_SPACE,
        seeds = [MARKET_SEED, token_mint.as_ref()],
        bump,
    )]
    pub market: Account<'info, PredictionMarket>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Creates a new prediction market for a given token.
/// The market will auto-resolve after `auto_resolve_days` from the factory config.
pub fn handle_create_market(
    ctx: Context<CreateMarket>,
    token_mint: Pubkey,
    token_name: String,
    ai_score: u8,
) -> Result<()> {
    require!(ai_score <= 100, RugError::InvalidAiScore);

    let now = Clock::get()?.unix_timestamp;
    let resolve_days = ctx.accounts.factory.auto_resolve_days as i64;
    let resolve_at = now
        .checked_add(resolve_days.checked_mul(SECONDS_PER_DAY).ok_or(RugError::MathOverflow)?)
        .ok_or(RugError::MathOverflow)?;

    let market = &mut ctx.accounts.market;
    market.token_mint = token_mint;
    market.token_name = token_name;
    market.created_at = now;
    market.resolve_at = resolve_at;
    market.total_rug_pool = 0;
    market.total_legit_pool = 0;
    market.total_bettors = 0;
    market.ai_score = ai_score;
    market.status = MarketStatus::Open;
    market.result = None;
    market.resolution_data = None;
    market.bump = ctx.bumps.market;

    // increment factory counter
    let factory = &mut ctx.accounts.factory;
    factory.total_markets = factory.total_markets
        .checked_add(1)
        .ok_or(RugError::MathOverflow)?;

    msg!(
        "market created for {} | ai_score: {} | resolves: {}",
        market.token_mint,
        ai_score,
        resolve_at
    );
    Ok(())
}
