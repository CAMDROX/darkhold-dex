import React from 'react'
import { Activity, Sparkles } from 'lucide-react'

export default function RecentTradesTape({ trades = [], isLoading = false }) {
  return (
    <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between transition-all duration-300">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-cinzel font-bold text-sm text-white tracking-wide">
              Market Trade Tape
            </h3>
          </div>
          <span className="text-[10px] font-mono text-white/50 tracking-wider">
            {isLoading ? 'SYNCING...' : `${trades.length} EXECUTIONS`}
          </span>
        </div>

        {/* Table Columns Title */}
        <div className="grid grid-cols-3 text-[10px] font-mono text-white/40 uppercase tracking-widest pb-2.5 px-3 border-b border-white/[0.06]">
          <span>Price (INR)</span>
          <span className="text-right">Quantity</span>
          <span className="text-right">Time</span>
        </div>

        {/* Trade Stream with Tactile Rows */}
        <div className="space-y-1 py-1.5 max-h-[340px] overflow-y-auto">
          {trades.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-white/30">
              No trades executed for this market yet. Be the first to place an order!
            </div>
          ) : (
            trades.map((trade, idx) => {
              const tradeTime = trade.executed_at
                ? new Date(trade.executed_at).toLocaleTimeString('en-GB')
                : 'Now'
              return (
                <div
                  key={trade.id || `trade-${idx}`}
                  className="grid grid-cols-3 text-xs font-mono py-1.5 px-3 rounded-xl hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200 animate-fade-in"
                >
                  <span className="text-[#22C55E] font-bold">
                    ₹{trade.price ? trade.price.toLocaleString() : '0'}
                  </span>
                  <span className="text-right text-white/90">
                    {trade.quantity} pass
                  </span>
                  <span className="text-right text-white/40 text-[11px]">
                    {tradeTime}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.06] text-center text-[10px] font-mono text-white/40 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
        <span>Atomic double-entry settlements with cryptographic QR rotation</span>
      </div>
    </div>
  )
}
