import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { PROGRAM_ID } from '../lib/constants';
import { useMarketStore } from '../store/marketStore';

// PredictionMarket account discriminator from IDL
const MARKET_DISCRIMINATOR = bs58.encode(
  Uint8Array.from([117, 150, 97, 152, 119, 58, 51, 58])
);

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

export function useMarkets() {
  const { connection } = useConnection();
  const [markets, setMarkets] = useState<MarketAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [
            { memcmp: { offset: 0, bytes: MARKET_DISCRIMINATOR } },
          ],
        });

        if (cancelled) return;

        const parsed: MarketAccount[] = [];
        for (const { pubkey, account } of accounts) {
          try {
            const data = account.data;
            // skip 8-byte discriminator
            let offset = 8;
            const tokenMint = data.subarray(offset, offset + 32);
            offset += 32;
            // token_name: String (4-byte len + bytes)
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

            // result: Option<bool>
            offset += 1;
            const resultTag = data[offset];
            offset += 1;
            const result = resultTag === 1 ? data[offset] === 1 : null;

            parsed.push({
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
            });
          } catch {
            // skip malformed accounts
          }
        }

        const sorted = parsed.sort((a, b) => b.createdAt - a.createdAt);
        setMarkets(sorted);
        useMarketStore.getState().setMarkets(sorted.map((m) => ({
          pubkey: m.pubkey,
          title: m.tokenName,
          status: m.status === 'Open' ? 0 : m.status === 'Resolved' ? 1 : 2,
          totalRug: m.totalRugPool,
          totalLegit: m.totalLegitPool,
          resolveAt: m.resolveAt,
        })));
      } catch (err) {
        console.error('[markets] fetch failed:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [connection]);

  return { markets, loading };
}
