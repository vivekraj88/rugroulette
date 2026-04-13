use anchor_lang::prelude::*;

use crate::errors::RugError;
use crate::state::{MarketStatus, PredictionMarket, UserBet};

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(
        mut,
        seeds = [crate::constants::MARKET_SEED, market.token_mint.as_ref()],
        bump = market.bump,
        constraint = market.status == MarketStatus::Cancelled @ RugError::MarketNotOpen,
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

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Refunds a bet from a cancelled market. Closes the bet account.
pub fn handler(ctx: Context<ClaimRefund>) -> Result<()> {
    let refund = ctx.accounts.user_bet.amount;

    let market_info = ctx.accounts.market.to_account_info();
    let bettor_info = ctx.accounts.bettor.to_account_info();
    require!(market_info.lamports() >= refund, RugError::MathOverflow);

    **market_info.try_borrow_mut_lamports()? -= refund;
    **bettor_info.try_borrow_mut_lamports()? += refund;

    msg!("refunded {} lamports from cancelled market", refund);
    Ok(())
}
