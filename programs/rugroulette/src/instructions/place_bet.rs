use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::{BET_SEED, FACTORY_SEED, PROFILE_SEED};
use crate::errors::RugError;
use crate::state::{BetSide, MarketFactory, MarketStatus, PredictionMarket, UserBet, UserProfile};

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(
        seeds = [FACTORY_SEED],
        bump = factory.bump,
    )]
    pub factory: Account<'info, MarketFactory>,

    #[account(
        mut,
        seeds = [crate::constants::MARKET_SEED, market.token_mint.as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Open @ RugError::MarketNotOpen,
    )]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = bettor,
        space = 8 + UserBet::INIT_SPACE,
        seeds = [BET_SEED, market.key().as_ref(), bettor.key().as_ref()],
        bump,
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(
        init_if_needed,
        payer = bettor,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [PROFILE_SEED, bettor.key().as_ref()],
        bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Places a RUG or LEGIT bet on an open market.
/// Transfers SOL from bettor to the market account and updates pool totals.
pub fn handle_place_bet(ctx: Context<PlaceBet>, side: BetSide, amount: u64) -> Result<()> {
    let factory = &ctx.accounts.factory;
    let market = &ctx.accounts.market;
    let now = Clock::get()?.unix_timestamp;

    // validate betting window
    require!(amount >= factory.min_bet, RugError::BetTooSmall);
    require!(now < market.resolve_at, RugError::BettingClosed);

    // save keys before mutable borrow
    let market_key = ctx.accounts.market.key();

    // record bet (state updates BEFORE CPI)
    let bet = &mut ctx.accounts.user_bet;
    bet.user = ctx.accounts.bettor.key();
    bet.market = market_key;
    bet.side = side.clone();
    bet.amount = amount;
    bet.placed_at = now;
    bet.claimed = false;
    bet.bump = ctx.bumps.user_bet;

    // update pool totals (state updates BEFORE CPI)
    let market = &mut ctx.accounts.market;
    match side {
        BetSide::Rug => {
            market.total_rug_pool = market.total_rug_pool
                .checked_add(amount)
                .ok_or(RugError::MathOverflow)?;
        }
        BetSide::Legit => {
            market.total_legit_pool = market.total_legit_pool
                .checked_add(amount)
                .ok_or(RugError::MathOverflow)?;
        }
    }
    market.total_bettors = market.total_bettors
        .checked_add(1)
        .ok_or(RugError::MathOverflow)?;

    // update profile (state updates BEFORE CPI)
    let profile = &mut ctx.accounts.user_profile;
    if profile.user == Pubkey::default() {
        profile.user = ctx.accounts.bettor.key();
        profile.bump = ctx.bumps.user_profile;
    }
    profile.total_bets = profile.total_bets
        .checked_add(1)
        .ok_or(RugError::MathOverflow)?;
    profile.total_volume = profile.total_volume
        .checked_add(amount)
        .ok_or(RugError::MathOverflow)?;

    // transfer SOL from bettor to market (CPI AFTER state updates)
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.key(),
        system_program::Transfer {
            from: ctx.accounts.bettor.to_account_info(),
            to: ctx.accounts.market.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    msg!("bet placed: {:?} {} lamports on market {}", side, amount, market_key);
    Ok(())
}
