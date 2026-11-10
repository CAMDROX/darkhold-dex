import React, { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0)

  const faqs = [
    {
      q: 'How do Anti-Scalping Price Collars prevent predatory gouging?',
      a: 'Each secondary festival pass or verified ticket is cryptographically registered with its original issuer Face Value (e.g. ₹2,000.00). The Darkhold Go engine implements a pre-matching validation gate enforcing a maximum collar ceiling (e.g., Face Value +25% = ₹2,500.00). Any limit ask, market order, or bot sweep attempt above this threshold is dropped at ingress with HTTP 422 Unprocessable Entity before ever touching the order book.',
    },
    {
      q: 'Why Go for the matching engine instead of executing directly in Supabase?',
      a: 'Relational databases require network round-trips and disk I/O locks, which typically result in 40ms to 200ms latency—far too sluggish to survive 1,000+ orders/sec bot floods. The Darkhold matching engine runs in-memory in Go using red-black price trees and ring buffers, delivering sub-millisecond matching latency (benchmarked at < 1ms / 569ns). Supabase is utilized strictly as an asynchronous double-entry ledger and escrow persistence layer.',
    },
    {
      q: 'How does In-Memory FIFO matching eliminate front-running and MEV?',
      a: 'In a deterministic FIFO (First-In, First-Out) matching model, orders at the same price level are queued with microsecond monotonic timestamps. No validator, bot, or miner can pay higher gas or bribe the system to jump the queue. Orders are matched in pure chronological arrival order.',
    },
    {
      q: 'How do Automated Dutch Auctions prevent panic dumping?',
      a: 'When a ticket holder faces an emergency or distressed sale, traditional platforms force them to panic dump below market price or risk not selling at all. In Darkhold, Dutch auctions initiate at the maximum collar ceiling and decay smoothly along a deterministic time-curve towards a reserve floor. Buyers compete to lock the pass at fair value before a competitor snatches it.',
    },
    {
      q: 'What is Double-Entry Atomic Settlement and Proof of Escrow?',
      a: 'Traditional secondary ticket scams involve sellers selling identical PDF screenshots to multiple people. Darkhold uses a double-entry ledger architecture where balance transfers are mathematically conserved (every debit must match a credit). Furthermore, buyer funds are held in escrow locks and are only disbursed to the seller once the unique ticket token/barcode verification is confirmed.',
    },
  ]

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      <div className="text-center max-w-2xl mx-auto mb-16 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061] mb-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
          <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-semibold tracking-wide">TECHNICAL & PROTOCOL FAQ</span>
        </div>
        <h2 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Frequently Answered
        </h2>
        <p className="text-base sm:text-lg text-white/75 font-light">
          Answers to the core architectural, financial, and anti-scalping mechanisms of Darkhold Exchange.
        </p>
      </div>

      <div className="space-y-4 relative z-10">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx
          return (
            <div
              key={idx}
              className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                isOpen 
                  ? 'spatial-glass border-[#D4AF37]/45 shadow-xl shadow-black/45' 
                  : 'bg-[#181B24] border-white/20 hover:border-white/25'
              }`}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer transition-colors"
              >
                <span className={`font-sans font-bold text-base sm:text-lg transition-colors ${
                  isOpen ? 'text-[#F5D061]' : 'text-white'
                }`}>
                  {faq.q}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isOpen ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 rotate-180' : 'bg-white/[0.07] border border-white/20'
                }`}>
                  <ChevronDown className="w-4 h-4 text-[#D4AF37]" />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-1 text-sm text-white/70 leading-relaxed border-t border-white/20 font-light">
                  {faq.a}
                </div>
              )}
            </div>
          )
        })}
      </div>

    </section>
  )
}
