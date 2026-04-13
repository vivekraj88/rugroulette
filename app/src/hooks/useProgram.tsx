import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from '../idl.json';

interface RugProgramCtx {
  program: Program | null;
  ready: boolean;
}

const ProgramContext = createContext<RugProgramCtx>({ program: null, ready: false });

export function RugProgramProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const ctx = useMemo<RugProgramCtx>(() => {
    if (!wallet) return { program: null, ready: false };
    const prov = new AnchorProvider(connection, wallet, { commitment: 'processed' });
    return { program: new Program(idl as any, prov), ready: true };
  }, [connection, wallet]);

  return <ProgramContext.Provider value={ctx}>{children}</ProgramContext.Provider>;
}

export const useRugProgram = () => useContext(ProgramContext);
