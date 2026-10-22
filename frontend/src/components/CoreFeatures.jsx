import React, { useState } from 'react'
import { Cpu, Radio, ShieldCheck, Database, Timer, Zap, Lock, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function CoreFeatures() {
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'pass' | 'victory'

  const features = [
    {
      id: 1,
      tier: 'pass',
      tierLabel: 'FOUNDATIONAL PASS TIER',
      title: 'In-Memory FIFO Matching Engine',
      summary: 'Deterministic price-time priority order book built in Go with lock-free ring buffers, executing limit and market orders in sub-10ms.',
      specs: ['Sub-10ms matching latency', 'Price-Time priority (FIFO)', 'Limit & Market order support', 'Zero race condition mutexing'],
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
    : features.filter(f => f.tier === activeFilter)

  return (
    <section id="features" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181412] border border-[#D4AF37]/30 text-xs font-mono text-[#E5C378] mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>SPECIFICATION MATRIX // PASS & VICTORY TIERS</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Core Engine Architecture
        </h2>
        <p className="text-base sm:text-lg text-[#B8B2A6]">
          Every component engineered specifically to satisfy and exceed the requirements of Problem Statement 07.
        </p>

        {/* Filter Pills */}
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#D4AF37] text-[#0B0908] font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                : 'bg-[#181412] border border-[#2D2520] text-[#9E9689] hover:text-white'
            }`}
          >
            ALL SPECIFICATIONS ({features.length})
          </button>
          <button
            onClick={() => setActiveFilter('pass')}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
              activeFilter === 'pass'
                ? 'bg-[#D4AF37] text-[#0B0908] font-bold shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                : 'bg-[#181412] border border-[#2D2520] text-[#9E9689] hover:text-white'
            }`}
          >
            FOUNDATIONAL (PASS TIER)
          </button>
          <button
            onClick={() => setActiveFilter('victory')}
            className={`px-4 py-2 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
              activeFilter === 'victory'
                ? 'bg-[#EF4444] text-white font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : 'bg-[#181412] border border-[#2D2520] text-[#9E9689] hover:text-white'
            }`}
          >
            ASCENDED (VICTORY TIER)
          </button>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFeatures.map((f) => {
          const Icon = f.icon
          const isCrimson = f.accent === 'crimson'
          const isEmerald = f.accent === 'emerald'

          return (
            <div
              key={f.id}
              className={`rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between group ${
                f.tier === 'victory' ? 'gloss-panel border-[#EF4444]/30 hover:border-[#EF4444]/60' : 'gloss-panel hover:border-[#D4AF37]/50'
              }`}
            >
              <div>
                {/* Header with Icon and Tier Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                      isCrimson
                        ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444] group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        : isEmerald
                        ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E] group-hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                        : 'bg-[#D4AF37]/15 border-[#D4AF37]/30 text-[#F5D061] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <span
                    className={`text-[9px] font-mono tracking-wider px-2.5 py-1 rounded-md border uppercase font-medium ${
                      f.tier === 'victory'
                        ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                        : 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]'
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
                <p className="text-sm text-[#A8A195] leading-relaxed mb-6 font-light">
                  {f.summary}
                </p>
              </div>

              {/* Technical Specifications checklist */}
              <div className="pt-4 border-t border-[#26201B] space-y-2">
                {f.specs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono text-[#D6CFC4]">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isCrimson ? 'text-[#EF4444]' : isEmerald ? 'text-[#22C55E]' : 'text-[#D4AF37]'
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
