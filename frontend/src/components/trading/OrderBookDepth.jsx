import React from 'react'
import {
  Layers,
  Activity,
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
    <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] flex flex-col justify-between transition-all duration-300">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-cinzel font-bold text-sm text-white tracking-wide">
              Level-2 Order Book Depth
            </h3>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[10px] font-mono text-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.15)]">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-[#F5D061]' : 'bg-[#22C55E]'} animate-pulse`} />
            <span className="font-semibold tracking-wide">{isLoading ? 'SYNCING...' : 'REAL-TIME L2 STREAM'}</span>
          </div>
        </div>

        {/* Table Columns Title (Light-Model Hierarchy) */}
        <div className="grid grid-cols-4 text-[10px] font-mono text-white/40 uppercase tracking-widest pb-2.5 px-3 border-b border-white/[0.06]">
          <span>Price (INR)</span>
          <span className="text-right">Size</span>
          <span className="text-right">Orders</span>
          <span className="text-right">Total Depth</span>
        </div>

        {/* ASKS (SELL ORDERS) - Luminous Red with Soft Floating Depth */}
        <div className="space-y-0.5 py-1.5 min-h-[140px] flex flex-col justify-end">
          {displayAsks.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-white/30">
              No resting sell asks on book
            </div>
          ) : (
            displayAsks.map((ask, idx) => {
              const widthPct = Math.min(100, Math.round((ask.quantity / maxQty) * 100))
              return (
                <div
                  key={`ask-${ask.price}-${idx}`}
                  onClick={() => onSelectPrice?.(ask.price)}
                  className="relative grid grid-cols-4 text-xs font-mono py-1.5 px-3 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                  title="Click to autofill price"
                >
                  {/* Floating Depth Heatbar with Diffuse Glow */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#EF4444]/25 via-[#EF4444]/12 to-transparent rounded-r-xl pointer-events-none transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                    style={{ width: `${widthPct}%` }}
                  />

                  {/* Primary Price: 100% Opacity */}
                  <span className="text-[#EF4444] font-bold relative z-10 group-hover:underline">
                    ₹{ask.price ? Number(ask.price).toLocaleString() : '0'}
                  </span>
                  
                  {/* Secondary Size: 90% Opacity */}
                  <span className="text-right text-white/90 font-medium relative z-10">
                    {ask.quantity || 0}
                  </span>
                  
                  {/* Peripheral Order Count: 45% Opacity */}
                  <span className="text-right text-white/45 relative z-10 text-[11px]">
                    {ask.order_count || 1}
                  </span>
                  
                  {/* Depth Total: 70% Opacity */}
                  <span className="text-right text-white/70 text-[11px] font-mono relative z-10">
                    ₹{((ask.price || 0) * (ask.quantity || 0)).toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* FLOATING MID-MARKET SPREAD SHELF */}
        <div className="my-2.5 py-2.5 px-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Activity className="w-3.5 h-3.5 text-[#F5D061]" />
            <span className="text-[11px] font-semibold text-white/80">
              Spread: <strong className="text-[#F5D061] font-bold">₹{(spread || 0).toLocaleString()}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/50">
            <span>Bid: <strong className="text-[#22C55E]">₹{bestBid > 0 ? Number(bestBid).toLocaleString() : '-'}</strong></span>
            <span>·</span>
            <span>Ask: <strong className="text-[#EF4444]">₹{bestAsk > 0 ? Number(bestAsk).toLocaleString() : '-'}</strong></span>
          </div>
        </div>

        {/* BIDS (BUY ORDERS) - Luminous Green with Soft Floating Depth */}
        <div className="space-y-0.5 py-1.5 min-h-[140px]">
          {bids.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-white/30">
              No resting buy bids on book
            </div>
          ) : (
            bids.map((bid, idx) => {
              const widthPct = Math.min(100, Math.round(((bid.quantity || 1) / maxQty) * 100))
              return (
                <div
                  key={`bid-${bid.price}-${idx}`}
                  onClick={() => onSelectPrice?.(bid.price)}
                  className="relative grid grid-cols-4 text-xs font-mono py-1.5 px-3 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group"
                  title="Click to autofill price"
                >
                  {/* Floating Depth Heatbar with Diffuse Glow */}
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#22C55E]/25 via-[#22C55E]/12 to-transparent rounded-r-xl pointer-events-none transition-all duration-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                    style={{ width: `${widthPct}%` }}
                  />

                  {/* Primary Price: 100% Opacity */}
                  <span className="text-[#22C55E] font-bold relative z-10 group-hover:underline">
                    ₹{bid.price ? Number(bid.price).toLocaleString() : '0'}
                  </span>
                  
                  {/* Secondary Size: 90% Opacity */}
                  <span className="text-right text-white/90 font-medium relative z-10">
                    {bid.quantity || 0}
                  </span>
                  
                  {/* Peripheral Order Count: 45% Opacity */}
                  <span className="text-right text-white/45 relative z-10 text-[11px]">
                    {bid.order_count || 1}
                  </span>
                  
                  {/* Depth Total: 70% Opacity */}
                  <span className="text-right text-white/70 text-[11px] font-mono relative z-10">
                    ₹{((bid.price || 0) * (bid.quantity || 0)).toLocaleString()}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Footer Meta & Autofill Hint */}
      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-white/40">
        <span className="text-[#22C55E]/90 font-medium">● Bids ({bids.length} levels)</span>
        <span>Click row to autofill price</span>
        <span className="text-[#EF4444]/90 font-medium">● Asks ({asks.length} levels)</span>
      </div>
    </div>
  )
}
