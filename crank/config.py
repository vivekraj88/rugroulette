"""RugRoulette crank configuration — all settings from environment."""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

_env = Path(__file__).parent / '.env'
if _env.exists():
    load_dotenv(_env)

# Logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()

def get_logger(name: str) -> logging.Logger:
    """Create a named logger with consistent formatting."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(name)s] %(levelname)s: %(message)s',
            datefmt='%H:%M:%S'
        ))
        logger.addHandler(handler)
    logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    return logger

_DEFAULTS = {
    'rpc': 'https://api.devnet.solana.com',
    'program': '3AKQmuMpZAMUiKm4pRw1BXFaUzFhx65Pi5XSBoBvkomC',
    'wallet': str(Path.home() / '.config/solana/id.json'),
}

RPC_URL = os.environ.get('ANCHOR_PROVIDER_URL', _DEFAULTS['rpc'])
PROGRAM_ID = os.environ.get('PROGRAM_ID', _DEFAULTS['program'])
WALLET_PATH = os.environ.get('CRANK_KEYPAIR_PATH',
              os.environ.get('ANCHOR_WALLET', _DEFAULTS['wallet']))

# API keys
HELIUS_API_KEY = os.environ.get('HELIUS_API_KEY', '')
BIRDEYE_API_KEY = os.environ.get('BIRDEYE_API_KEY', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')

# Scheduling
SCAN_INTERVAL_MINUTES = int(os.environ.get('SCAN_INTERVAL_MINUTES', '5'))
RESOLVE_CHECK_INTERVAL_MINUTES = int(os.environ.get('RESOLVE_CHECK_INTERVAL_MINUTES', '60'))

# Scanner limits
MIN_LIQUIDITY_USD = int(os.environ.get('MIN_LIQUIDITY_USD', '5000'))
MAX_MARKETS_PER_DAY = int(os.environ.get('MAX_MARKETS_PER_DAY', '4'))

# AI scorer
ANTHROPIC_MODEL = os.environ.get('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')

# Retry settings
MAX_RETRIES = int(os.environ.get('MAX_RETRIES', '3'))
RETRY_BASE_DELAY = float(os.environ.get('RETRY_BASE_DELAY', '1.0'))
