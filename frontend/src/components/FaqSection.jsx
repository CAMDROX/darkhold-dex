import React, { useState } from 'react'
import { ChevronDown, HelpCircle, Shield, Cpu, Scale, Lock } from 'lucide-react'

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0)

  const faqs = [
    {
      q: 'How do Anti-Scalping Price Collars prevent predatory gouging?',
      a: 'Each secondary festival pass or relic is cryptographically registered with its original issuer Face Value (e.g. ₹2,000.00). The Darkhold Go engine implements a pre-matching validation gate enforcing a maximum collar ceiling (e.g., Face Value +25% = ₹2,500.00). Any limit ask, market order, or bot sweep attempt above this threshold is dropped at ingress with HTTP 422 Unprocessable Entity before ever touching the order book.',
    },
    {
      q: 'Why Go for the matching engine instead of executing directly in Supabase?',
      a: 'Relational databases require network round-trips and disk I/O locks, which typically result in 40ms to 200ms latency—far too sluggish to survive 1,000+ orders/sec bot floods. The Darkhold matching engine runs in-memory in Go using red-black price trees and ring buffers, delivering sub-10ms matching latency (benchmarked at <4.2ms). Supabase is utilized strictly as an asynchronous double-entry ledger and escrow persistence layer.',
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
      
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181412] border border-[#D4AF37]/30 text-xs font-mono text-[#D4AF37] mb-4">
          <HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>TECHNICAL & PROTOCOL FAQ</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Frequently Answered
        </h2>
        <p className="text-base sm:text-lg text-[#B8B2A6]">
          Answers to the core architectural, financial, and anti-scalping mechanisms of Darkhold Exchange.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx
          return (
            <div
              key={idx}
              className="gloss-panel rounded-2xl border-[#2A231F] overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[#1E1916]/40 transition-colors"
              >
                <span className="font-cinzel font-bold text-base sm:text-lg text-white">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-[#D4AF37] shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-6 pb-6 pt-1 text-sm text-[#C2BCB0] leading-relaxed border-t border-[#221B17] font-light">
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
