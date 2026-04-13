use anchor_lang::prelude::*;

use crate::constants::{FACTORY_SEED, PROFILE_SEED};
use crate::errors::RugError;
use crate::state::{BetSide, MarketFactory, MarketStatus, PredictionMarket, UserBet, UserProfile};

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        seeds = [FACTORY_SEED],
        bump = factory.bump,
    )]
    pub factory: Account<'info, MarketFactory>,

    #[account(
        mut,
        seeds = [crate::constants::MARKET_SEED, market.token_mint.as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Resolved @ RugError::MarketNotOpen,
        constraint = market.result.is_some() @ RugError::MarketNotReady,
    )]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        mut,
        seeds = [crate::constants::BET_SEED, market.key().as_ref(), bettor.key().as_ref()],
        bump = user_bet.bump,
        constraint = !user_bet.claimed @ RugError::AlreadyClaimed,
        close = bettor,
    )]
    pub user_bet: Account<'info, UserBet>,

    #[account(
        mut,
        seeds = [PROFILE_SEED, bettor.key().as_ref()],
        bump = user_profile.bump,
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Claims proportional winnings from a resolved market.
/// Formula: payout = (user_bet / winning_pool) * losing_pool * (1 - fee)
pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &ctx.accounts.user_bet;
    let result_is_rug = market.result.ok_or(RugError::MarketNotReady)?;

    // check user bet on winning side
    let user_won = match bet.side {
        BetSide::Rug => result_is_rug,
        BetSide::Legit => !result_is_rug,
    };
    require!(user_won, RugError::NotAWinner);

    // calculate payout
    let (winning_pool, losing_pool) = if result_is_rug {
        (market.total_rug_pool, market.total_legit_pool)
    } else {
        (market.total_legit_pool, market.total_rug_pool)
    };

    // fee already deducted during resolve, so losing_pool on-chain is post-fee
    // payout = user_bet_amount + (user_bet / winning_pool) * losing_pool
    let share_of_losers = bet.amount
        .checked_mul(losing_pool)
        .ok_or(RugError::MathOverflow)?
        .checked_div(winning_pool.max(1))
        .ok_or(RugError::MathOverflow)?;

    let total_payout = bet.amount
        .checked_add(share_of_losers)
        .ok_or(RugError::MathOverflow)?;

    // transfer from market account to bettor (validate balance first)
    let market_info = ctx.accounts.market.to_account_info();
    let bettor_info = ctx.accounts.bettor.to_account_info();
    require!(market_info.lamports() >= total_payout, RugError::MathOverflow);

    **market_info.try_borrow_mut_lamports()? -= total_payout;
    **bettor_info.try_borrow_mut_lamports()? += total_payout;

    // update profile
    let profile = &mut ctx.accounts.user_profile;
    profile.correct_predictions = profile.correct_predictions
        .checked_add(1)
        .ok_or(RugError::MathOverflow)?;
    profile.earnings = profile.earnings
        .checked_add(share_of_losers)
        .ok_or(RugError::MathOverflow)?;
    profile.current_streak = profile.current_streak
        .checked_add(1)
        .ok_or(RugError::MathOverflow)?;
    if profile.current_streak > profile.best_streak {
        profile.best_streak = profile.current_streak;
    }

    msg!(
        "claimed {} lamports (bet: {} + winnings: {})",
        total_payout,
        bet.amount,
        share_of_losers
    );
    Ok(())
}
