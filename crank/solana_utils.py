"""Shared Solana utilities for the RugRoulette crank."""

import json
import os
import tempfile
from pathlib import Path

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.transaction import Transaction
from solders.message import Message
from solana.rpc.async_api import AsyncClient
from solana.rpc.commitment import Confirmed

FACTORY_SEED = b"factory"
MARKET_SEED = b"market"


def load_keypair(path: str) -> Keypair:
    """Load a Solana keypair from a JSON file."""
    expanded = Path(path).expanduser()
    with open(expanded) as f:
        secret = json.load(f)
    return Keypair.from_bytes(bytes(secret))


def derive_factory_pda(program_id: Pubkey) -> tuple[Pubkey, int]:
    """Derive the MarketFactory PDA address."""
    return Pubkey.find_program_address([FACTORY_SEED], program_id)


def derive_market_pda(token_mint: Pubkey, program_id: Pubkey) -> tuple[Pubkey, int]:
    """Derive a PredictionMarket PDA for a given token mint."""
    return Pubkey.find_program_address([MARKET_SEED, bytes(token_mint)], program_id)


async def send_and_confirm_tx(
    client: AsyncClient,
    program_id: Pubkey,
    accounts: list[AccountMeta],
    ix_data: bytes,
    signer: Keypair,
) -> str:
    """Build, sign, send a transaction and wait for confirmation.

    Returns the transaction signature string.
    Raises on send failure or confirmation timeout.
    """
    from solana.rpc.types import TxOpts

    ix = Instruction(program_id=program_id, accounts=accounts, data=ix_data)

    # Fetch fresh blockhash right before signing
    recent = await client.get_latest_blockhash(commitment=Confirmed)
    blockhash = recent.value.blockhash

    msg = Message.new_with_blockhash([ix], signer.pubkey(), blockhash)
    tx = Transaction.new_unsigned(msg)
    tx.sign([signer], blockhash)

    resp = await client.send_transaction(
        tx,
        opts=TxOpts(skip_preflight=False, preflight_commitment=Confirmed),
    )
    sig = resp.value

    await client.confirm_transaction(sig, commitment=Confirmed)
    return str(sig)


def atomic_json_write(filepath: Path, data):
    """Write JSON to a file atomically using a temp file + rename."""
    dir_path = filepath.parent
    fd, tmp_path = tempfile.mkstemp(dir=str(dir_path), suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp_path, str(filepath))
    except BaseException:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def atomic_json_read(filepath: Path, default=None):
    """Read JSON from a file, returning default if file does not exist."""
    if not filepath.exists():
        return default
    with open(filepath) as f:
        return json.load(f)
