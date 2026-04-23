import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { PROGRAM_ID } from '../lib/constants';

const MARKET_DISCRIMINATOR = bs58.encode(
  Uint8Array.from([117, 150, 97, 152, 119, 58, 51, 58])
);

const POLL_INTERVAL_MS = 30_000;

export interface MarketAccount {
  pubkey: string;
  tokenMint: string;
  tokenName: string;
  createdAt: number;
  resolveAt: number;
  totalRugPool: number;
  totalLegitPool: number;
  totalBettors: number;
  aiScore: number;
  status: 'Open' | 'Resolved' | 'Cancelled';
  result: boolean | null;
}

function parseMarketAccount(pubkey: PublicKey, data: Buffer): MarketAccount | null {
  try {
    let offset = 8;
    const tokenMint = data.subarray(offset, offset + 32);
    offset += 32;
    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const tokenName = data.subarray(offset, offset + nameLen).toString('utf8');
    offset += nameLen;
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const resolveAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const totalRugPool = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const totalLegitPool = Number(data.readBigUInt64LE(offset));
    offset += 8;
    const totalBettors = data.readUInt32LE(offset);
    offset += 4;
    const aiScore = data[offset];
    offset += 1;
    const statusByte = data[offset];
    const status = statusByte === 0 ? 'Open' : statusByte === 1 ? 'Resolved' : 'Cancelled';
    offset += 1;
    const resultTag = data[offset];
    offset += 1;
    const result = resultTag === 1 ? data[offset] === 1 : null;

    return {
      pubkey: pubkey.toBase58(),
      tokenMint: new PublicKey(tokenMint).toBase58(),
      tokenName,
      createdAt,
      resolveAt,
      totalRugPool,
      totalLegitPool,
      totalBettors,
      aiScore,
      status,
      result,
    };
  } catch {
    return null;
  }
}

export function useMarkets() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<MarketAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async (isInitial: boolean) => {
    try {
      setFetchError(null);
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { memcmp: { offset: 0, bytes: MARKET_DISCRIMINATOR } },
        ],
      });

      const parsed: MarketAccount[] = [];
      for (const { pubkey, account } of accounts) {
        const m = parseMarketAccount(pubkey, account.data as Buffer);
        if (m) parsed.push(m);
      }

      // exclude cancelled (spam/test), keep open + resolved
      const valid = parsed.filter((m) => m.status !== 'Cancelled');
      const sorted = valid.sort((a, b) => b.createdAt - a.createdAt);
      setMarkets(sorted);
    } catch {
      setFetchError('Failed to load markets');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    let cancelled = false;

    fetchMarkets(true);

    const interval = setInterval(() => {
      if (!cancelled) fetchMarkets(false);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchMarkets]);

  const refresh = useCallback(() => fetchMarkets(false), [fetchMarkets]);

  return { markets, loading, fetchError, refresh };
}
