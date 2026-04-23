use anchor_lang::prelude::*;

use crate::constants::FACTORY_SEED;
use crate::errors::RugError;
use crate::state::MarketFactory;

#[derive(Accounts)]
pub struct UpdateFactory<'info> {
    #[account(
        mut,
        seeds = [FACTORY_SEED],
        bump = factory.bump,
        constraint = factory.authority == authority.key() @ RugError::Unauthorized,
    )]
    pub factory: Account<'info, MarketFactory>,

    pub authority: Signer<'info>,
}

/// Update factory configuration (authority only).
/// Validates bounds: resolve_days 1-30, fee max 1000bps (10%), min_bet > 0.
pub fn handle_update_factory(
    ctx: Context<UpdateFactory>,
    auto_resolve_days: u8,
    market_fee_bps: u16,
    min_bet: u64,
) -> Result<()> {
    require!(auto_resolve_days >= 1 && auto_resolve_days <= 30, RugError::InvalidConfig);
    require!(market_fee_bps <= 1000, RugError::InvalidConfig);
    require!(min_bet > 0, RugError::InvalidConfig);

    let factory = &mut ctx.accounts.factory;
    factory.auto_resolve_days = auto_resolve_days;
    factory.market_fee_bps = market_fee_bps;
    factory.min_bet = min_bet;

    msg!(
        "factory updated: resolve={}d, fee={}bps, min_bet={}",
        auto_resolve_days, market_fee_bps, min_bet
    );
    Ok(())
}
