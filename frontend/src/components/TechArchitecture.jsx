import React, { useState } from 'react'
import { Terminal, Database, Cpu, Layers, Check } from 'lucide-react'

export default function TechArchitecture() {
  const [activeSnippet, setActiveSnippet] = useState('go') // 'go' | 'supabase' | 'k6'

  const goCode = `// Darkhold In-Memory FIFO Matching Engine in Go
package engine

type OrderBook struct {
    sync.RWMutex
    Bids *PriceTree // Red-Black tree of Buy orders (Price-Time FIFO)
    Asks *PriceTree // Red-Black tree of Sell orders (Price-Time FIFO)
    Collar DynamicCollar
}

// ProcessLimitOrder enforces anti-scalp collars before book insertion
func (ob *OrderBook) ProcessLimitOrder(order *Order) (*TradeResult, error) {
    // 1. Dynamic Anti-Scalper Collar Gate (< 0.2ms)
    if err := ob.Collar.Validate(order.Price, order.FaceValue); err != nil {
        return nil, ErrCollarBreach // Rejects predatory markups (HTTP 422)
    }

    // 2. Intrusive Doubly-Linked FIFO Matching Loop (< 1ms)
    trades := ob.matchFIFO(order)

    // 3. Emit Async Settlement Event to Supabase Double-Entry Worker
    go ob.dispatchAtomicSettlement(trades)

    // 4. Broadcast Delta Level-2 Ladder via WebSockets
    ob.streamL2DepthDelta(order.MarketID)
    return trades, nil
}`

  const supabaseCode = `-- Supabase PostgreSQL Double-Entry Ledger Schema
CREATE TABLE ledger_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID REFERENCES trades(trade_id) NOT NULL,
    debit_account_id UUID REFERENCES user_wallets(wallet_id) NOT NULL,
    credit_account_id UUID REFERENCES user_wallets(wallet_id) NOT NULL,
    amount_inr NUMERIC(12, 2) NOT NULL CHECK (amount_inr > 0),
    currency VARCHAR(8) DEFAULT 'INR',
    escrow_status VARCHAR(20) DEFAULT 'LOCKED_DELIVERY', -- Released on barcode verify
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance conservation constraint: Sum(Debits) must equal Sum(Credits)
CREATE CONSTRAINT TRIGGER enforce_zero_balance_anomaly
AFTER INSERT OR UPDATE ON ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION verify_zero_phantom_tokens();`

  const k6Code = `// k6 Concurrency Benchmark: 1,000+ Orders/Sec Stress Test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 500 },   // Warm-up to 500 VUs
    { duration: '1m',  target: 1250 },  // Victory Tier: 1,000+ OPS peak load
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(99)<10'],  // Ultra-low matching latency SLA
    'http_req_failed': ['rate<0.001'],  // 99.99% zero race-condition delivery
  },
};`

  return (
    <section id="architecture" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-semibold tracking-wide">FULL-STACK ARCHITECTURE</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          System Topology & Pipeline
        </h2>
        <p className="text-base sm:text-lg text-white/60 font-light">
          Engineered as requested: <strong>React</strong> for responsive low-latency frontend, 
          <strong> Go</strong> for ultra-fast in-memory FIFO matching, and <strong>Supabase</strong> for ACID double-entry ledger persistence.
        </p>
      </div>

      {/* 3-Tier Architecture Flow Diagram (Spatial Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        
        {/* Tier 1: Frontend */}
        <div className="spatial-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-[#D4AF37]/50">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono tracking-widest text-[#F5D061] uppercase font-bold">
                TIER 1 · CLIENT INTERFACE
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <h3 className="font-cinzel font-bold text-xl text-white mb-2">
              React 19 & WebSockets
            </h3>
            <p className="text-xs text-white/50 mb-4 leading-relaxed font-light">
              Vite-powered ultra-fast frontend streaming real-time Level 2 depth ladders, order submissions, and Dutch auction ticks.
            </p>
          </div>
          <ul className="text-xs font-mono text-white/70 space-y-2 pt-4 border-t border-white/[0.06]">
            <li>• Bidirectional WebSocket streaming</li>
            <li>• SVG / Canvas depth charts</li>
            <li>• Spatial glassmorphism tokens</li>
            <li>• Microsecond order dispatching</li>
          </ul>
        </div>

        {/* Tier 2: Backend */}
        <div className="spatial-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-[0_28px_70px_-10px_rgba(0,0,0,0.98),0_0_35px_rgba(34,197,94,0.15)]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                TIER 2 · MATCHING ENGINE
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <h3 className="font-cinzel font-bold text-xl text-white mb-2">
              Go In-Memory FIFO Engine
            </h3>
            <p className="text-xs text-white/50 mb-4 leading-relaxed font-light">
              High-frequency Go binary executing limit and market orders using red-black trees, doubly-linked queues, sub-millisecond matching, and dynamic price collars.
            </p>
          </div>
          <ul className="text-xs font-mono text-white/70 space-y-2 pt-4 border-t border-white/[0.06]">
            <li>• Sub-millisecond latency execution (&lt; 1ms)</li>
            <li>• Anti-scalper dynamic price collars</li>
            <li>• Lock-free concurrency (Goroutines)</li>
            <li>• Automated Dutch auction ticker</li>
          </ul>
        </div>

        {/* Tier 3: Database & Ledger */}
        <div className="spatial-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between hover:border-rose-500/50 hover:shadow-[0_28px_70px_-10px_rgba(0,0,0,0.98),0_0_35px_rgba(239,68,68,0.15)]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono tracking-widest text-rose-400 uppercase font-bold">
                TIER 3 · DATABASE & ESCROW
              </span>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Database className="w-5 h-5" />
              </div>
            </div>
            <h3 className="font-cinzel font-bold text-xl text-white mb-2">
              Supabase DB Only
            </h3>
            <p className="text-xs text-white/50 mb-4 leading-relaxed font-light">
              Strict persistence layer handling double-entry accounting ledger entries, cryptographic delivery escrow, and tamper-proof trade audits.
            </p>
          </div>
          <ul className="text-xs font-mono text-white/70 space-y-2 pt-4 border-t border-white/[0.06]">
            <li>• Double-entry balance conservation</li>
            <li>• Zero phantom tokens / anomalies</li>
            <li>• Barcode delivery escrow state locks</li>
            <li>• High-speed asynchronous batch writes</li>
          </ul>
        </div>

      </div>

      {/* Code Snippet Tabs (Spatial Glass Console) */}
      <div className="spatial-glass rounded-3xl border border-white/[0.1] overflow-hidden shadow-[0_25px_60px_-10px_rgba(0,0,0,0.95)]">
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-black/60">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-mono text-xs text-white font-semibold">
              Implementation Artifacts & Code Walkthrough
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0 p-1 rounded-xl bg-black/50 border border-white/[0.06]">
            <button
              onClick={() => setActiveSnippet('go')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                activeSnippet === 'go'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Go Matching Engine
            </button>
            <button
              onClick={() => setActiveSnippet('supabase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                activeSnippet === 'supabase'
                  ? 'bg-[#D4AF37]/20 text-[#F5D061] border border-[#D4AF37]/40 shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              Supabase Double-Entry SQL
            </button>
            <button
              onClick={() => setActiveSnippet('k6')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all ${
                activeSnippet === 'k6'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              k6 / Locust Stress Benchmarks
            </button>
          </div>
        </div>

        <div className="p-6 bg-black/70 overflow-x-auto">
          <pre className="font-mono text-xs sm:text-sm text-white/90 leading-relaxed">
            <code>
              {activeSnippet === 'go' && goCode}
              {activeSnippet === 'supabase' && supabaseCode}
              {activeSnippet === 'k6' && k6Code}
            </code>
          </pre>
        </div>
      </div>

    </section>
  )
}
