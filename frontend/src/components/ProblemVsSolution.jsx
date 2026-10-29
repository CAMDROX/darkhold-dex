import React from 'react'
import { ShieldX, ShieldCheck, Flame, Skull, Zap, CheckCircle2, Lock, Ban, Scale, ArrowRight } from 'lucide-react'

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
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181412] border border-[#D4AF37]/30 text-xs font-mono text-[#D4AF37] mb-4">
          <span>THE SECONDARY CRISIS · RE-ENGINEERED</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Predatory Bots vs. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#EF4444]">
            The Darkhold Citadel
          </span>
        </h2>
        <p className="text-base sm:text-lg text-[#B8B2A6]">
          Secondary ticket and relic markets are infected by bot cartels and predatory gouging. 
          Here is how Darkhold restores mathematical fairness.
        </p>
      </div>

      {/* Two Column Grid: The Predatory Past vs The Darkhold Protocol */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Card: The Broken Legacy Model */}
        <div className="gloss-panel-crimson rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-[#EF4444]/20 mb-6">
              <div>
                <span className="text-xs font-mono tracking-widest text-[#EF4444] uppercase block">
                  STATUS QUO
                </span>
                <h3 className="font-cinzel font-bold text-2xl text-white mt-1">
                  The Scalper Monopoly
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
                <Skull className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-6">
              {problems.map((p, idx) => {
                const Icon = p.icon
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#2E1212] border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444] shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {p.title}
                      </h4>
                      <p className="text-sm text-[#A89E94] mt-1 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#EF4444]/20 flex items-center justify-between text-xs font-mono text-[#EF4444]">
            <span>Average Fan Markup: +380%</span>
            <span>Bots Corner: ~78% Supply</span>
          </div>
        </div>

        {/* Right Card: The Darkhold Arcane Protocol */}
        <div className="gloss-panel rounded-2xl p-6 sm:p-8 border-[#D4AF37]/40 flex flex-col justify-between shadow-[0_15px_45px_rgba(212,175,55,0.12)]">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-[#D4AF37]/20 mb-6">
              <div>
                <span className="text-xs font-mono tracking-widest text-[#F5D061] uppercase block">
                  DARKHOLD PROTOCOL
                </span>
                <h3 className="font-cinzel font-bold text-2xl text-white mt-1">
                  Deterministic Order Book
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-6">
              {solutions.map((s, idx) => {
                const Icon = s.icon
                return (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#241C15] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shrink-0 mt-0.5 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-semibold text-white">
                          {s.title}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F5D061]">
                          {s.tag}
                        </span>
                      </div>
                      <p className="text-sm text-[#C2BCB0] mt-1 leading-relaxed">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#D4AF37]/20 flex items-center justify-between text-xs font-mono text-[#22C55E]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Zero Gouging Guarantee
            </span>
            <span className="text-[#D4AF37]">Execution: &lt; 10ms</span>
          </div>
        </div>

      </div>

    </section>
  )
}
