import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import fs from 'fs';
import idl from './src/idl.json';

const PROGRAM_ID = new PublicKey('3AKQmuMpZAMUiKm4pRw1BXFaUzFhx65Pi5XSBoBvkomC');
const RPC = process.env.HELIUS_RPC_URL || 'https://api.devnet.solana.com';

// load deploy keypair as authority
const raw = JSON.parse(fs.readFileSync('../deploy-keypair.json', 'utf-8'));
const authority = Keypair.fromSecretKey(Uint8Array.from(raw));

const connection = new Connection(RPC, 'confirmed');

const wallet = {
  publicKey: authority.publicKey,
  signTransaction: async (tx: any) => { tx.sign(authority); return tx; },
  signAllTransactions: async (txs: any[]) => { txs.forEach(t => t.sign(authority)); return txs; },
};

const provider = new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
const program = new Program(idl as any, provider);

const FACTORY_SEED = Buffer.from('factory');
const MARKET_SEED = Buffer.from('market');

function getFactoryPda() {
  return PublicKey.findProgramAddressSync([FACTORY_SEED], PROGRAM_ID);
}

function getMarketPda(tokenMint: PublicKey) {
  return PublicKey.findProgramAddressSync([MARKET_SEED, tokenMint.toBuffer()], PROGRAM_ID);
}

// fake token mints for test markets
const MARKETS = [
  { name: 'BONK',   mint: Keypair.generate().publicKey, aiScore: 15 },
  { name: 'WIF',    mint: Keypair.generate().publicKey, aiScore: 42 },
  { name: 'POPCAT', mint: Keypair.generate().publicKey, aiScore: 78 },
  { name: 'BOME',   mint: Keypair.generate().publicKey, aiScore: 91 },
  { name: 'MYRO',   mint: Keypair.generate().publicKey, aiScore: 55 },
];

async function main() {
  console.log('Authority:', authority.publicKey.toBase58());
  const bal = await connection.getBalance(authority.publicKey);
  console.log('Balance:', bal / 1e9, 'SOL');

  if (bal < 0.05 * 1e9) {
    console.log('Not enough SOL, requesting airdrop...');
    const sig = await connection.requestAirdrop(authority.publicKey, 1e9);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('Airdrop done');
  }

  const [factoryPda] = getFactoryPda();

  // 1. Initialize factory if needed
  const factoryAcct = await connection.getAccountInfo(factoryPda);
  if (!factoryAcct) {
    console.log('\nInitializing factory...');
    const tx = await program.methods
      .initializeFactory(300, new BN(10_000_000)) // 3% fee, 0.01 SOL min bet
      .accountsPartial({
        factory: factoryPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();
    console.log('Factory initialized:', tx);
  } else {
    console.log('\nFactory already exists');
  }

  // 2. Create markets
  for (const m of MARKETS) {
    const [marketPda] = getMarketPda(m.mint);
    const existing = await connection.getAccountInfo(marketPda);
    if (existing) {
      console.log(`Market ${m.name} already exists, skipping`);
      continue;
    }

    console.log(`\nCreating market: ${m.name} (AI score: ${m.aiScore})...`);
    try {
      const tx = await program.methods
        .createMarket(m.mint, m.name, m.aiScore)
        .accountsPartial({
          factory: factoryPda,
          market: marketPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      console.log(`  Created: ${tx}`);
    } catch (e: any) {
      console.error(`  Failed: ${e.message?.slice(0, 100)}`);
    }
  }

  console.log('\nDone! Refresh the RugRoulette UI to see markets.');
}

main().catch(console.error);
