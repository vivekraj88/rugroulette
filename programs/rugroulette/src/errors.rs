use anchor_lang::prelude::*;

#[error_code]
pub enum RugError {
    #[msg("Market is not open for betting")]
    MarketNotOpen,
    #[msg("Market has not reached resolution time")]
    MarketNotReady,
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    #[msg("Bet amount below minimum")]
    BetTooSmall,
    #[msg("Bet already placed on this market")]
    AlreadyBet,
    #[msg("Winnings already claimed")]
    AlreadyClaimed,
    #[msg("User did not win this market")]
    NotAWinner,
    #[msg("Unauthorized: caller is not the authority")]
    Unauthorized,
    #[msg("Math overflow in payout calculation")]
    MathOverflow,
    #[msg("Invalid AI score: must be 0-100")]
    InvalidAiScore,
    #[msg("Market betting window has expired")]
    BettingClosed,
    #[msg("User did not lose this market")]
    NotALoser,
}
