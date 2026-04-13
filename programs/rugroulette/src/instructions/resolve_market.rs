use anchor_lang::prelude::*;

use crate::constants::FACTORY_SEED;
use crate::errors::RugError;
use crate::state::{MarketFactory, MarketStatus, PredictionMarket, ResolutionData};

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        seeds = [FACTORY_SEED],
        bump = factory.bump,
        constraint = factory.authority == resolver.key() @ RugError::Unauthorized,
    )]
    pub factory: Account<'info, MarketFactory>,

    #[account(
        mut,
        seeds = [crate::constants::MARKET_SEED, market.token_mint.as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Open @ RugError::MarketAlreadyResolved,
    )]
    pub market: Account<'info, PredictionMarket>,

    /// CHECK: treasury receives collected fees
    #[account(
        mut,
        constraint = treasury.key() == factory.treasury @ RugError::Unauthorized,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub resolver: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Resolves a market after the resolution window has passed.
/// Collects the platform fee and marks the market as resolved.
pub fn handler(
    ctx: Context<ResolveMarket>,
    result: bool,
    data: ResolutionData,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let market = &ctx.accounts.market;

    // allow early resolution only if liquidity removed > 90%
    if now < market.resolve_at {
        require!(
            data.liquidity_removed_pct > 90,
            RugError::MarketNotReady
        );
    }

    let total_pool = market.total_rug_pool
        .checked_add(market.total_legit_pool)
        .ok_or(RugError::MathOverflow)?;

    // collect platform fee
    let fee_bps = ctx.accounts.factory.market_fee_bps as u64;
    let fee = total_pool
        .checked_mul(fee_bps)
        .ok_or(RugError::MathOverflow)?
        .checked_div(10000)
        .ok_or(RugError::MathOverflow)?;

    // grab account infos before mutable borrow (for lamport transfer below)
    let market_info = ctx.accounts.market.to_account_info();
    let treasury_info = ctx.accounts.treasury.to_account_info();

    // update market state FIRST (before lamport transfer)
    // cap fee to losing pool size to prevent underflow
    let market = &mut ctx.accounts.market;
    let losing_pool = if result { market.total_legit_pool } else { market.total_rug_pool };
    let capped_fee = fee.min(losing_pool);

    if result {
        market.total_legit_pool = market.total_legit_pool
            .checked_sub(capped_fee)
            .ok_or(RugError::MathOverflow)?;
    } else {
        market.total_rug_pool = market.total_rug_pool
            .checked_sub(capped_fee)
            .ok_or(RugError::MathOverflow)?;
    }
    market.status = MarketStatus::Resolved;
    market.result = Some(result);
    // enforce resolved_by to actual resolver, don't trust input
    let mut verified_data = data;
    verified_data.resolved_by = ctx.accounts.resolver.key();
    market.resolution_data = Some(verified_data);

    // transfer fee AFTER state updates — use capped_fee to match state deduction
    if capped_fee > 0 {
        let market_lamports = market_info.lamports();
        require!(market_lamports >= capped_fee, RugError::MathOverflow);

        **market_info.try_borrow_mut_lamports()? -= capped_fee;
        **treasury_info.try_borrow_mut_lamports()? += capped_fee;
    }

    msg!(
        "market resolved: {} | result: {} | fee: {} lamports",
        market.token_mint,
        if result { "RUG" } else { "LEGIT" },
        capped_fee
    );
    Ok(())
}
