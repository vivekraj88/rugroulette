import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ── Scroll reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── Animated counter ── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.unobserve(el); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || !ref.current) return;
    const el = ref.current;
    const start = performance.now();
    const duration = 2000;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [started, target, suffix]);

  return <span ref={ref} className="tabular-nums">0{suffix}</span>;
}

/* ── FAQ Item ── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-base-content/5">
      <button
        className="w-full flex justify-between items-center py-4 text-left text-sm font-medium text-base-content/80 hover:text-base-content transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        <span className={`text-error transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-4' : 'max-h-0'}`}>
        <p className="text-xs text-base-content/40 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Main Landing Page ── */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-base-100 font-mono relative overflow-hidden" data-theme="rugroulette">
      {/* ── Background layers ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(239,68,68,0.12),transparent_70%)]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vh] bg-[radial-gradient(circle,rgba(239,68,68,0.05),transparent_60%)]" />
        <div className="absolute top-[40%] left-[-10%] w-[40vw] h-[40vh] bg-[radial-gradient(circle,rgba(34,197,94,0.04),transparent_60%)]" />
        {/* Dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:32px_32px]" />
      </div>

      {/* ── Floating orbs ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-error/[0.06] blur-[100px] top-[10%] left-[15%] animate-[float_18s_ease-in-out_infinite]" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-error/[0.04] blur-[80px] top-[60%] right-[10%] animate-[float_22s_ease-in-out_infinite_reverse]" />
        <div className="absolute w-[200px] h-[200px] rounded-full bg-success/[0.03] blur-[80px] bottom-[20%] left-[40%] animate-[float_20s_ease-in-out_infinite_3s]" />
      </div>

      {/* ── Navigation ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="text-xl font-bold tracking-wider">
          <span className="text-error text-glow-red">RUG</span>
          <span className="text-success text-glow-green">ROULETTE</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://x.com/RouletteRug" target="_blank" rel="noopener noreferrer" className="text-base-content/30 hover:text-base-content/60 transition-colors" title="@RouletteRug on X">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://github.com/vivekraj88/rugroulette" target="_blank" rel="noopener noreferrer" className="text-base-content/30 hover:text-base-content/60 transition-colors" title="GitHub">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
          <Link
            to="/app"
            className="btn-cta-landing"
          >
            Launch App
            <span className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          SECTION 1: HERO
          ══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — copy */}
          <div className="flex-1 text-center lg:text-left">
            <Reveal>
              <p className="text-xs text-error/60 font-medium uppercase tracking-widest mb-4">
                Solana Prediction Market
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-5 tracking-tight">
                <span className="text-base-content">Every token is </span>
                <span className="landing-gradient-text">guilty</span>
                <br />
                <span className="text-base-content">until proven </span>
                <span className="text-success text-glow-green">legit</span>
                <span className="text-base-content/40">.</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-base text-base-content/45 max-w-lg mb-8 leading-relaxed mx-auto lg:mx-0">
                Bet on whether new pump.fun tokens will rug or survive.
                AI-scored markets resolve in 24 hours. Your degen knowledge finally pays off.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/app" className="btn-cta-landing text-base px-8 py-3.5">
                  Start Predicting
                  <span className="ml-2">&rarr;</span>
                </Link>
                <a href="#how-it-works" className="btn-ghost-landing text-base px-8 py-3.5">
                  How It Works
                </a>
              </div>
            </Reveal>
          </div>

          {/* Right — preview card */}
          <Reveal delay={400} className="flex-1 w-full max-w-md">
            <div className="landing-preview-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-bold text-base-content">Tung Tung Sahur</span>
                  <span className="text-[10px] text-base-content/25 font-mono block">J8PSd...pump</span>
                </div>
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-error/10 border border-error/20">
                  <span className="text-error font-bold text-sm">75<span className="text-[9px] opacity-60">%</span></span>
                </div>
              </div>

              {/* Pool bars */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-[11px]">
                  <span className="text-error font-medium">RUG 68%</span>
                  <span className="text-success font-medium">LEGIT 32%</span>
                </div>
                <div className="w-full h-3 bg-base-100 rounded-full overflow-hidden flex">
                  <div className="bg-gradient-to-r from-red-600 to-error h-full rounded-l-full shadow-[0_0_10px_rgba(239,68,68,0.4)] w-[68%]" />
                  <div className="bg-gradient-to-r from-success to-green-600 h-full flex-1 rounded-r-full" />
                </div>
              </div>

              {/* Bet buttons */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 bg-error/90 text-center py-2 rounded-lg text-sm font-bold text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  {'\u2620'} RUG
                </div>
                <div className="flex-1 bg-base-100 border border-base-content/10 text-center py-2 rounded-lg text-sm text-base-content/50">
                  {'\u2713'} LEGIT
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between text-[11px] text-base-content/30">
                <span>2.4 SOL pool</span>
                <span>12 bettors</span>
                <span className="text-warning font-medium">18h 34m left</span>
              </div>

              {/* Decorative scan lines */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-error/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-error/10 to-transparent" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 2: STATS BAR
          ══════════════════════════════════════════ */}
      <section className="relative z-10 border-y border-base-content/5 bg-base-100/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: 62, suffix: '+', label: 'Markets Created' },
            { value: 24, suffix: 'h', label: 'Resolution Time' },
            { value: 3, suffix: '%', label: 'Protocol Fee' },
            { value: 11, suffix: '', label: 'Instructions On-Chain' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div>
                <div className="text-3xl sm:text-4xl font-bold text-base-content">
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[10px] text-base-content/30 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3: HOW IT WORKS
          ══════════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            How It <span className="text-error">Works</span>
          </h2>
          <p className="text-sm text-base-content/40 text-center mb-12 max-w-md mx-auto">
            Three steps from degen knowledge to SOL profits
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: '\u{1F50D}',
              title: 'Pick a Token',
              desc: 'New pump.fun tokens appear as markets. Each gets an AI-powered rug risk score based on liquidity, holder distribution, and contract analysis.',
            },
            {
              step: '02',
              icon: '\u{1F3B2}',
              title: 'Place Your Bet',
              desc: 'Bet RUG or LEGIT with SOL. Pool-based odds — the more people bet one side, the better the payout if you bet the other.',
            },
            {
              step: '03',
              icon: '\u{1F4B0}',
              title: 'Collect Winnings',
              desc: 'Markets resolve automatically in 24 hours using on-chain data. If liquidity pulled or price crashed — it\'s a rug. Winners split the pool.',
            },
          ].map((item, i) => (
            <Reveal key={item.step} delay={i * 120}>
              <div className="landing-feature-card group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-[10px] text-error/40 font-bold tracking-widest">STEP {item.step}</span>
                </div>
                <h3 className="text-base font-bold mb-2 text-base-content group-hover:text-error transition-colors">{item.title}</h3>
                <p className="text-xs text-base-content/40 leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 4: THE EDGE
          ══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Your <span className="landing-gradient-text">Edge</span>
          </h2>
          <p className="text-sm text-base-content/40 text-center mb-12 max-w-md mx-auto">
            This isn't blind gambling. You're betting with data.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: '\u{1F916}',
              title: 'AI Risk Scoring',
              desc: 'Every market gets Claude-powered analysis — liquidity depth, holder concentration, creator history, contract patterns.',
            },
            {
              icon: '\u26D3',
              title: 'On-Chain Resolution',
              desc: 'No human judges. Markets resolve based on verifiable on-chain data — liquidity changes and price movements.',
            },
            {
              icon: '\u2696',
              title: 'Fair Pool-Based Odds',
              desc: 'No house edge on individual bets. Winners split the losing pool minus a 3% protocol fee. Simple, transparent math.',
            },
            {
              icon: '\u26A1',
              title: 'Instant Payouts',
              desc: 'Claim winnings immediately after resolution. SOL goes straight to your wallet. No withdrawal delays.',
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 100}>
              <div className="landing-feature-card">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center text-base">{item.icon}</span>
                  <h3 className="text-sm font-bold text-base-content">{item.title}</h3>
                </div>
                <p className="text-xs text-base-content/40 leading-relaxed pl-12">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 5: LIVE MARKETS PREVIEW
          ══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <Reveal>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Live <span className="text-error">Markets</span>
            </h2>
          </div>
          <p className="text-sm text-base-content/40 text-center mb-10">
            Real prediction markets running on Solana devnet right now
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { name: 'Tung Tung Sahur', score: 75, rug: 68, pool: '2.4', bettors: 12, time: '18h 34m' },
              { name: 'Buttcoin', score: 75, rug: 55, pool: '1.8', bettors: 8, time: '12h 10m' },
              { name: 'WOJAK', score: 75, rug: 72, pool: '3.1', bettors: 15, time: '6h 45m' },
              { name: 'Chill House', score: 75, rug: 41, pool: '0.9', bettors: 5, time: '22h 15m' },
            ].map((m, i) => (
              <div key={m.name} className="landing-market-card animate-card-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-sm">{m.name}</span>
                  <span className="text-error text-xs font-bold bg-error/10 px-2 py-0.5 rounded-full">{m.score}%</span>
                </div>
                <div className="w-full h-2 bg-base-100 rounded-full overflow-hidden flex mb-2">
                  <div className="bg-gradient-to-r from-red-600 to-error h-full rounded-l-full" style={{ width: `${m.rug}%` }} />
                  <div className="bg-gradient-to-r from-success to-green-600 h-full flex-1 rounded-r-full" />
                </div>
                <div className="flex justify-between text-[10px] text-base-content/30">
                  <span>{m.pool} SOL</span>
                  <span>{m.bettors} bettors</span>
                  <span className="text-warning">{m.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={400}>
          <div className="text-center">
            <Link to="/app" className="btn-cta-landing px-8 py-3">
              View All Markets &rarr;
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 6: TRUST / ON-CHAIN
          ══════════════════════════════════════════ */}
      <section className="relative z-10 border-y border-base-content/5 bg-base-200/30">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <Reveal>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Fully <span className="text-error">On-Chain</span>
            </h2>
            <p className="text-sm text-base-content/40 max-w-lg mx-auto mb-8">
              Every bet, every resolution, every payout is a verifiable Solana transaction.
              No trust required — just math and code.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-base-100 rounded-xl border border-base-content/5 px-5 py-3">
              <div className="text-[11px] text-base-content/30">
                <span className="text-base-content/50 font-medium">Program ID</span>
              </div>
              <code className="text-[11px] text-error/70 font-mono break-all">
                3AKQmuMpZAMUiKm4pRw1BXFaUzFhx65Pi5XSBoBvkomC
              </code>
              <span className="badge badge-xs badge-outline text-[9px] border-success/30 text-success">devnet</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 7: FAQ
          ══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-2xl font-bold text-center mb-10">
            <span className="text-error">FAQ</span>
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="glass-panel rounded-xl p-5">
            <FaqItem
              q="How are markets resolved?"
              a="Markets resolve automatically 24 hours after creation. The crank checks on-chain data: if liquidity dropped >80%, price crashed >70%, or the pool died — it's a rug. Everything else is legit."
            />
            <FaqItem
              q="What is the Rug Score?"
              a="An AI-generated risk score (0-100%) based on token liquidity, holder distribution, creator history, and contract patterns. Higher score = higher rug probability. Powered by Claude AI."
            />
            <FaqItem
              q="How are payouts calculated?"
              a="Pool-based. If you bet on the winning side, you get your bet back plus a share of the losing pool proportional to your bet size. A 3% protocol fee is deducted from the losing pool."
            />
            <FaqItem
              q="Is this on mainnet?"
              a="Currently on Solana devnet. All SOL is devnet SOL (free from faucet). The smart contract is fully functional with 11 on-chain instructions."
            />
            <FaqItem
              q="Can I create my own markets?"
              a="Markets are created by an automated crank that scans pump.fun for new token launches. The crank runs 1-5 markets per day with randomized timing."
            />
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 8: FINAL CTA
          ══════════════════════════════════════════ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to <span className="landing-gradient-text">predict</span>?
          </h2>
          <p className="text-sm text-base-content/40 mb-8 max-w-md mx-auto">
            Connect your wallet, pick a side, and prove your rug detection skills.
          </p>
          <Link to="/app" className="btn-cta-landing text-lg px-10 py-4 inline-flex items-center gap-2">
            Launch App <span>&rarr;</span>
          </Link>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
          ══════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-base-content/5">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm font-bold tracking-wider">
            <span className="text-error">RUG</span><span className="text-success">ROULETTE</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-base-content/30">
            <Link to="/app" className="hover:text-error transition-colors">App</Link>
            <span className="text-base-content/10">|</span>
            <a href="https://github.com/vivekraj88/rugroulette" target="_blank" rel="noopener noreferrer" className="hover:text-error transition-colors">GitHub</a>
            <span className="text-base-content/10">|</span>
            <a href="https://x.com/RouletteRug" target="_blank" rel="noopener noreferrer" className="hover:text-error transition-colors">Twitter</a>
            <span className="text-base-content/10">|</span>
            <span>Solana Devnet</span>
          </div>
          <p className="text-[10px] text-base-content/20">
            Built for degens, by degens. Colosseum Hackathon 2026.
          </p>
        </div>
      </footer>
    </div>
  );
}
