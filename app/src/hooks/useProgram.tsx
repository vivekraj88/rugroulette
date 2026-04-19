import { createContext, useMemo, type ReactNode } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program, type Idl } from '@coral-xyz/anchor';
import idlJson from '../idl.json';

const idl = idlJson as Idl;

interface RugProgramCtx {
  program: Program | null;
  ready: boolean;
}

export const ProgramContext = createContext<RugProgramCtx>({ program: null, ready: false });

export function RugProgramProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const ctx = useMemo<RugProgramCtx>(() => {
    if (!wallet) return { program: null, ready: false };
    const prov = new AnchorProvider(connection, wallet, { commitment: 'processed' });
    return { program: new Program(idl, prov), ready: true };
  }, [connection, wallet]);

  return <ProgramContext.Provider value={ctx}>{children}</ProgramContext.Provider>;
}
