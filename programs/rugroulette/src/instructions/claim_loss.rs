use anchor_lang::prelude::*;

use crate::constants::PROFILE_SEED;
use crate::errors::RugError;
use crate::state::{BetSide, MarketStatus, PredictionMarket, UserBet, UserProfile};

#[derive(Accounts)]
pub struct ClaimLoss<'info> {
    #[account(
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

/// Allows a losing bettor to close their bet account and recover rent.
/// Also resets their current streak to 0.
pub fn handle_claim_loss(ctx: Context<ClaimLoss>) -> Result<()> {
    let market = &ctx.accounts.market;
    let bet = &ctx.accounts.user_bet;
    let result_is_rug = market.result.ok_or(RugError::MarketNotReady)?;

    // verify user actually lost
    let user_won = match bet.side {
        BetSide::Rug => result_is_rug,
        BetSide::Legit => !result_is_rug,
    };
    require!(!user_won, RugError::NotALoser);

    // mark claimed before close
    let bet_mut = &mut ctx.accounts.user_bet;
    bet_mut.claimed = true;

    // reset streak on loss
    let profile = &mut ctx.accounts.user_profile;
    profile.current_streak = 0;

    msg!("loss acknowledged — bet account closed, streak reset");
    Ok(())
}
