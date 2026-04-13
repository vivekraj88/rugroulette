use anchor_lang::prelude::*;

use crate::constants::FACTORY_SEED;
use crate::state::MarketFactory;

#[derive(Accounts)]
pub struct InitializeFactory<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + MarketFactory::INIT_SPACE,
        seeds = [FACTORY_SEED],
        bump,
    )]
    pub factory: Account<'info, MarketFactory>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Creates the global MarketFactory configuration.
/// Should be called once by the admin before any markets can be created.
pub fn handler(
    ctx: Context<InitializeFactory>,
    market_fee_bps: u16,
    min_bet: u64,
) -> Result<()> {
    let factory = &mut ctx.accounts.factory;
    factory.authority = ctx.accounts.authority.key();
    factory.total_markets = 0;
    factory.market_fee_bps = market_fee_bps;
    factory.min_bet = min_bet;
    factory.treasury = ctx.accounts.authority.key();
    factory.auto_resolve_days = crate::constants::DEFAULT_RESOLVE_DAYS;
    factory.bump = ctx.bumps.factory;
    Ok(())
}
