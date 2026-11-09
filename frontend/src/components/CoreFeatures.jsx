import React, { useState } from 'react'
import { Cpu, Radio, ShieldCheck, Database, Timer, Zap, Lock, Sparkles, CheckCircle2 } from 'lucide-react'

export default function CoreFeatures() {
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'pass' | 'victory'

  const features = [
    {
      id: 1,
      tier: 'pass',
      tierLabel: 'FOUNDATIONAL PASS TIER',
      title: 'In-Memory FIFO Matching Engine',
      summary: 'Deterministic price-time priority order book built in Go with intrusive doubly-linked queues and red-black price levels, executing limit and market orders in sub-millisecond time.',
      specs: ['Sub-millisecond matching latency (< 1ms)', 'Price-Time priority (FIFO)', 'Limit & Market order support', 'Zero race condition mutexing'],
      icon: Cpu,
      accent: 'gold',
    },
    {
      id: 2,
      tier: 'pass',
      tierLabel: 'FOUNDATIONAL PASS TIER',
      title: 'Dynamic Anti-Scalper Price Collars',
      summary: 'Dynamic price caps mathematically tethered to the original face value. Bids and asks outside the algorithmic collar are intercepted at engine ingress.',
      specs: ['Face-value algorithmic ceiling', 'Configurable band (+15% to +30%)', 'Pre-matching rejection (422)', 'Bot swarm throttling'],
      icon: ShieldCheck,
      accent: 'crimson',
    },
    {
      id: 3,
      tier: 'pass',
      tierLabel: 'FOUNDATIONAL PASS TIER',
      title: 'Real-Time WebSocket L2 Depth',
      summary: 'Bidirectional binary WebSockets streaming Level 2 orderbook changes, cumulative depth curves, and spread updates without page refresh.',
      specs: ['Zero page-reload latency', 'Delta book compression', 'L2 Bids & Asks depth ladders', 'Sub-millisecond broadcast'],
      icon: Radio,
      accent: 'emerald',
    },
    {
      id: 4,
      tier: 'pass',
      tierLabel: 'FOUNDATIONAL PASS TIER',
      title: 'Atomic Double-Entry Ledger',
      summary: 'Supabase PostgreSQL double-entry bookkeeping ledger guaranteeing mathematical balance conservation and zero phantom tokens.',
      specs: ['Strict debit-credit balance', 'Zero balance anomalies', 'ACID transaction boundary', 'Immutable audit trail'],
      icon: Database,
      accent: 'gold',
    },
    {
      id: 5,
      tier: 'victory',
      tierLabel: 'ASCENDED VICTORY TIER',
      title: 'Automated Dutch Auction Engine',
      summary: 'Continuous price-decay engine allowing distressed sellers to liquidate passes over time. Prices decay gracefully until a bidder executes.',
      specs: ['Automated decay curves', 'Real-time bidding rounds', 'Distress sale liquidation', 'Anti-panic floor protection'],
      icon: Timer,
      accent: 'crimson',
    },
    {
      id: 6,
      tier: 'victory',
      tierLabel: 'ASCENDED VICTORY TIER',
      title: '1,000+ OPS Stress Resilience',
      summary: 'Benchmarked with Locust and k6 under 1,000+ simulated simultaneous orders per second using lock-free data structures and worker pools.',
      specs: ['1,000+ orders/sec throughput', 'Lock-free Go channels', 'p99 latency < 15ms under load', 'k6/Locust stress suites'],
      icon: Zap,
      accent: 'emerald',
    },
    {
      id: 7,
      tier: 'victory',
      tierLabel: 'ASCENDED VICTORY TIER',
      title: 'Proof of Solvency & Escrow Locks',
      summary: 'Cryptographic balance reconciliation where secondary funds remain locked in escrow until authentic ticket barcode verification is confirmed.',
      specs: ['Cryptographic escrow state machine', 'Ticket barcode verification', 'Proof of reserve checks', 'Instant dispute resolution'],
      icon: Lock,
      accent: 'gold',
    },
  ]

  const filteredFeatures = activeFilter === 'all' 
    ? features 
    : features.filter((f) => f.tier === activeFilter)

  return (
    <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-semibold tracking-wide">ENGINE SPECIFICATIONS · HIGH-CONCURRENCY ARCHITECTURE</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Core Engine Architecture
        </h2>
        <p className="text-base sm:text-lg text-white/60 font-light">
          Every component engineered for institutional secondary ticketing with sub-millisecond execution.
        </p>

        {/* Filter Pills (Spatial Segmented Control) */}
        <div className="inline-flex justify-center items-center gap-1.5 p-1.5 rounded-2xl bg-black/50 border border-white/[0.08] mt-8 shadow-inner">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.02]'
                : 'bg-transparent text-white/50 hover:text-white'
            }`}
          >
            ALL SPECIFICATIONS ({features.length})
          </button>
          <button
            onClick={() => setActiveFilter('pass')}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
              activeFilter === 'pass'
                ? 'bg-[#D4AF37] text-black font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-[1.02]'
                : 'bg-transparent text-white/50 hover:text-white'
            }`}
          >
            FOUNDATIONAL (PASS TIER)
          </button>
          <button
            onClick={() => setActiveFilter('victory')}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all duration-300 cursor-pointer ${
              activeFilter === 'victory'
                ? 'bg-rose-500 text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-[1.02]'
                : 'bg-transparent text-white/50 hover:text-white'
            }`}
          >
            ASCENDED (VICTORY TIER)
          </button>
        </div>
      </div>

      {/* Feature Cards Grid (Spatial Cards with 3D Hover Lift) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredFeatures.map((f) => {
          const Icon = f.icon
          const isCrimson = f.accent === 'crimson'
          const isEmerald = f.accent === 'emerald'

          return (
            <div
              key={f.id}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between group spatial-card ${
                f.tier === 'victory' 
                  ? 'hover:border-rose-500/50 hover:shadow-[0_28px_70px_-10px_rgba(0,0,0,0.98),0_0_35px_rgba(239,68,68,0.15)]' 
                  : 'hover:border-[#D4AF37]/50 hover:shadow-[0_28px_70px_-10px_rgba(0,0,0,0.98),0_0_35px_rgba(212,175,55,0.15)]'
              }`}
            >
              <div>
                {/* Header with Icon and Tier Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                      isCrimson
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 group-hover:shadow-[0_0_25px_rgba(239,68,68,0.35)]'
                        : isEmerald
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 group-hover:shadow-[0_0_25px_rgba(34,197,94,0.35)]'
                        : 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#F5D061] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.35)]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <span
                    className={`text-[9px] font-mono tracking-wider px-3 py-1 rounded-full border uppercase font-bold ${
                      f.tier === 'victory'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                        : 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#F5D061]'
                    }`}
                  >
                    {f.tier === 'victory' ? 'Victory Tier' : 'Pass Tier'}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-cinzel font-bold text-xl text-white mb-2 group-hover:text-[#F5D061] transition-colors">
                  {f.title}
                </h3>

                {/* Summary */}
                <p className="text-xs sm:text-sm text-white/50 leading-relaxed mb-6 font-light">
                  {f.summary}
                </p>
              </div>

              {/* Technical Specifications checklist */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                {f.specs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-white/80">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isCrimson ? 'text-rose-400' : isEmerald ? 'text-emerald-400' : 'text-[#D4AF37]'
                      }`}
                    />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

    </section>
  )
}
