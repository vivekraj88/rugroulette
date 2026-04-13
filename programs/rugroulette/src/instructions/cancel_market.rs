use anchor_lang::prelude::*;

use crate::constants::FACTORY_SEED;
use crate::errors::RugError;
use crate::state::{MarketFactory, MarketStatus, PredictionMarket};

#[derive(Accounts)]
pub struct CancelMarket<'info> {
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

/// Cancels a market. Individual bet refunds happen via separate claim_refund instruction.
/// Sets market status to Cancelled so bettors can reclaim their SOL.
pub fn handler(ctx: Context<CancelMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.status = MarketStatus::Cancelled;
    market.result = None;

    msg!("market cancelled: {}", market.token_mint);
    Ok(())
}
