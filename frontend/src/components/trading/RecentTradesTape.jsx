import React from 'react'
import {
  Activity,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function RecentTradesTape({ trades, isLoading }) {
  return (
    <div className="rounded-2xl gloss-panel border border-[#2A211B] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#221B16]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-cinzel font-bold text-sm text-white tracking-wide">
              Market Trade Tape
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#8E867A]">
            {trades.length} RECENT EXECUTIONS
          </span>
        </div>

        {/* Table Columns Title */}
        <div className="grid grid-cols-3 text-[10px] font-mono text-[#8E867A] uppercase tracking-wider pb-2 px-2 border-b border-[#1A1411]">
          <span>Price (INR)</span>
          <span className="text-right">Quantity</span>
          <span className="text-right">Time</span>
        </div>

        {/* Trade Stream */}
        <div className="space-y-1 py-1 max-h-[320px] overflow-y-auto custom-scrollbar">
          {trades.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#6A6357]">
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
                  className="grid grid-cols-3 text-xs font-mono py-1.5 px-2 rounded hover:bg-[#181310] transition-colors animate-fade-in"
                >
                  <span className="text-[#22C55E] font-bold">
                    ₹{trade.price ? trade.price.toLocaleString() : '0'}
                  </span>
                  <span className="text-right text-[#E0DBD2]">
                    {trade.quantity} pass
                  </span>
                  <span className="text-right text-[#8E867A] text-[11px]">
                    {tradeTime}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[#1C1613] text-center text-[10px] font-mono text-[#8E867A] flex items-center justify-center gap-1.5">
        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
        <span>Atomic double-entry settlements with cryptographic QR rotation</span>
      </div>
    </div>
  )
}
