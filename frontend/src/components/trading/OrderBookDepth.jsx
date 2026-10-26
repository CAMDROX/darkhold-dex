import React from 'react'
import {
  Layers,
  TrendingDown,
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react'

export default function OrderBookDepth({
  l2Data,
  isLoading,
  onSelectPrice,
}) {
  const bids = l2Data?.bids || []
  const asks = l2Data?.asks || []
  const spread = l2Data?.spread || 0
  const bestBid = l2Data?.best_bid || 0
  const bestAsk = l2Data?.best_ask || 0

  // Calculate max volume for relative depth bars
  const maxQty = Math.max(
    ...bids.map((b) => b.quantity),
    ...asks.map((a) => a.quantity),
    1
  )

  // Reverse asks so lowest ask is at the bottom (closest to spread)
  const displayAsks = [...asks].reverse()

  return (
    <div className="rounded-2xl gloss-panel border border-[#2A211B] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#221B16]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-cinzel font-bold text-sm text-white tracking-wide">
              Level-2 Order Book
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#22C55E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span>REAL-TIME L2 STREAM</span>
          </div>
        </div>

        {/* Table Columns Title */}
        <div className="grid grid-cols-4 text-[10px] font-mono text-[#8E867A] uppercase tracking-wider pb-2 px-2 border-b border-[#1A1411]">
          <span>Price (INR)</span>
          <span className="text-right">Size</span>
          <span className="text-right">Orders</span>
          <span className="text-right">Depth</span>
        </div>

        {/* ASKS (SELL ORDERS) - Red */}
        <div className="space-y-0.5 py-1 min-h-[140px] flex flex-col justify-end">
          {displayAsks.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-[#6A6357]">
              No resting sell asks on book
            </div>
          ) : (
            displayAsks.map((ask, idx) => {
              const widthPct = Math.min(100, Math.round((ask.quantity / maxQty) * 100))
              return (
                <div
                  key={`ask-${ask.price}-${idx}`}
                  onClick={() => onSelectPrice?.(ask.price)}
                  className="relative grid grid-cols-4 text-xs font-mono py-1 px-2 rounded hover:bg-[#EF4444]/10 cursor-pointer transition-colors group"
                >
                  {/* Depth Heatbar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[#EF4444]/15 rounded-r pointer-events-none transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />

                  <span className="text-[#EF4444] font-semibold relative z-10 group-hover:underline">
                    ₹{ask.price.toLocaleString()}
                  </span>
                  <span className="text-right text-[#E0DBD2] relative z-10">
                    {ask.quantity}
                  </span>
                  <span className="text-right text-[#8E867A] relative z-10">
                    {ask.order_count}
                  </span>
                  <span className="text-right text-[#C0B7A8] text-[11px] relative z-10">
                    ₹{(ask.price * ask.quantity).toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* SPREAD INDICATOR */}
        <div className="my-2 py-2 px-3 rounded-xl bg-[#120E0C] border border-[#261E18] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#D4AF37]">
            <Activity className="w-3.5 h-3.5 text-[#F5D061]" />
            <span className="text-[11px] font-semibold">Spread: ₹{spread.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#8E867A]">
            <span>Bid: <strong className="text-[#22C55E]">₹{bestBid > 0 ? bestBid : '-'}</strong></span>
            <span>·</span>
            <span>Ask: <strong className="text-[#EF4444]">₹{bestAsk > 0 ? bestAsk : '-'}</strong></span>
          </div>
        </div>

        {/* BIDS (BUY ORDERS) - Green */}
        <div className="space-y-0.5 py-1 min-h-[140px]">
          {bids.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-[#6A6357]">
              No resting buy bids on book
            </div>
          ) : (
            bids.map((bid, idx) => {
              const widthPct = Math.min(100, Math.round((bid.quantity / maxQty) * 100))
              return (
                <div
                  key={`bid-${bid.price}-${idx}`}
                  onClick={() => onSelectPrice?.(bid.price)}
                  className="relative grid grid-cols-4 text-xs font-mono py-1 px-2 rounded hover:bg-[#22C55E]/10 cursor-pointer transition-colors group"
                >
                  {/* Depth Heatbar */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[#22C55E]/15 rounded-r pointer-events-none transition-all duration-300"
                    style={{ width: `${widthPct}%` }}
                  />

                  <span className="text-[#22C55E] font-semibold relative z-10 group-hover:underline">
                    ₹{bid.price.toLocaleString()}
                  </span>
                  <span className="text-right text-[#E0DBD2] relative z-10">
                    {bid.quantity}
                  </span>
                  <span className="text-right text-[#8E867A] relative z-10">
                    {bid.order_count}
                  </span>
                  <span className="text-right text-[#C0B7A8] text-[11px] relative z-10">
                    ₹{(bid.price * bid.quantity).toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[#1C1613] text-center text-[10px] font-mono text-[#8E867A]">
        Click any price row to autofill your order limit price
      </div>
    </div>
  )
}
