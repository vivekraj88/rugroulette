"""RugRoulette crank configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from crank directory
_env = Path(__file__).parent / '.env'
if _env.exists():
    load_dotenv(_env)

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
MIN_LIQUIDITY_USD = 5000
MAX_MARKETS_PER_DAY = 10
