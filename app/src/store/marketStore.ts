import { create } from 'zustand'

interface MarketInfo {
  pubkey: string
  title: string
  status: number
  totalRug: number
  totalLegit: number
  resolveAt: number
}

interface MarketStore {
  markets: MarketInfo[]
  loading: boolean
  lastFetch: number
  setMarkets: (markets: MarketInfo[]) => void
  setLoading: (v: boolean) => void
}

export const useMarketStore = create<MarketStore>((set) => ({
  markets: [],
  loading: true,
  lastFetch: 0,
  setMarkets: (markets) => set({ markets, loading: false, lastFetch: Date.now() }),
  setLoading: (loading) => set({ loading }),
}))
