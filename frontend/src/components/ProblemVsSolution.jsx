import React from 'react'
import { ShieldX, ShieldCheck, Flame, Skull, Zap, CheckCircle2, Lock, Ban, Scale } from 'lucide-react'

export default function ProblemVsSolution() {
  const problems = [
    {
      title: 'Predatory 400%+ Markups',
      desc: 'Bots hoard limited-tier festival passes and resell on secondary platforms at extortionate gouging rates.',
      icon: Flame,
    },
    {
      title: 'Sub-Second Bot Cartels',
      desc: 'Centralized web queues crumble under automated bot swarms, leaving authentic fans empty-handed.',
      icon: Skull,
    },
    {
      title: 'Duplicate Barcode Fraud',
      desc: 'Opaque secondary sites re-sell identical PDF screenshots to multiple fans with zero cryptographic verification.',
      icon: ShieldX,
    },
    {
      title: 'Opaque Settlement & High Cuts',
      desc: 'Traditional platforms hold seller funds for 30+ days while taking 20% to 35% in hidden processing cuts.',
      icon: Ban,
    },
  ]

  const solutions = [
    {
      title: 'Dynamic Anti-Scalper Price Collars',
      desc: 'Hard algorithmic ceiling strictly pinned to original face value (e.g., max +25%). Orders above the cap are dropped at engine ingress with HTTP 422.',
      icon: ShieldCheck,
      tag: 'COLLAR GUARD',
    },
    {
      title: 'In-Memory FIFO Matching Engine (Go)',
      desc: 'Deterministic price-time priority executing in real time (< 1ms). Eliminates MEV, front-running, and queue jumps with microsecond precision.',
      icon: Zap,
      tag: 'HIGH-SPEED ENGINE',
    },
    {
      title: 'Cryptographic Escrow & Proof of Solvency',
      desc: 'Double-entry balance conservation in Supabase. Funds are locked in escrow and only disbursed upon verified ticket token handoff.',
      icon: Lock,
      tag: 'DOUBLE-ENTRY',
    },
    {
      title: 'Automated Dutch Auction Liquidations',
      desc: 'Distressed or last-minute passes decay smoothly from the collar ceiling down to floor price, guaranteeing fair clearing without panic dumping.',
      icon: Scale,
      tag: 'PRICE DECAY',
    },
  ]

  return (
    <section id="problem-defense" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Ambient Depth Lights */}
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <span className="font-semibold tracking-wide">THE SECONDARY CRISIS · RE-ENGINEERED</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Predatory Bots vs. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#EF4444]">
            The Darkhold Citadel
          </span>
        </h2>
        <p className="text-base sm:text-lg text-white/60 font-light">
          Secondary ticket and relic markets are infected by bot cartels and predatory gouging. 
          Here is how Darkhold restores mathematical fairness.
        </p>
      </div>

      {/* Two Column Grid: The Predatory Past vs The Darkhold Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        
        {/* Left Card: The Broken Legacy Model */}
        <div className="gloss-panel-crimson rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-[0_25px_60px_-10px_rgba(0,0,0,0.95)] hover:-translate-y-1.5 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-rose-500/25 mb-6">
              <div>
                <span className="text-xs font-mono tracking-widest text-rose-400 uppercase block font-bold">
                  STATUS QUO
                </span>
                <h3 className="font-cinzel font-bold text-2xl text-white mt-1">
                  The Scalper Monopoly
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <Skull className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-4">
              {problems.map((p, idx) => {
                const Icon = p.icon
                return (
                  <div key={idx} className="flex items-start gap-4 p-3.5 rounded-2xl bg-black/40 border border-white/[0.04] shadow-inner hover:border-rose-500/30 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 shadow-sm">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {p.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/50 mt-1 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-rose-500/20 flex items-center justify-between text-xs font-mono text-rose-400 font-semibold">
            <span>Average Fan Markup: +380%</span>
            <span>Bots Corner: ~78% Supply</span>
          </div>
        </div>

        {/* Right Card: The Darkhold Arcane Protocol */}
        <div className="spatial-glass rounded-3xl p-6 sm:p-8 border-white/[0.12] flex flex-col justify-between shadow-[0_25px_60px_-10px_rgba(0,0,0,0.95),0_0_35px_rgba(212,175,55,0.08)] hover:-translate-y-1.5 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08] mb-6">
              <div>
                <span className="text-xs font-mono tracking-widest text-[#F5D061] uppercase block font-bold">
                  DARKHOLD PROTOCOL
                </span>
                <h3 className="font-cinzel font-bold text-2xl text-white mt-1">
                  Deterministic Order Book
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 flex items-center justify-center text-[#F5D061] shadow-[0_0_25px_rgba(212,175,55,0.3)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-4">
              {solutions.map((s, idx) => {
                const Icon = s.icon
                return (
                  <div key={idx} className="flex items-start gap-4 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] shadow-inner hover:border-[#D4AF37]/40 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-black/60 border border-[#D4AF37]/45 flex items-center justify-center text-[#F5D061] shrink-0 mt-0.5 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-white">
                          {s.title}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#F5D061] font-bold">
                          {s.tag}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-white/50 mt-1 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-emerald-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Zero Gouging Guarantee
            </span>
            <span className="text-[#F5D061]">Execution: &lt; 10ms</span>
          </div>
        </div>

      </div>

    </section>
  )
}
