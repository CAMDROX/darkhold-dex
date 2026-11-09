import React, { useState } from 'react'
import {
  Layers,
  Activity,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import PaginationBar from '../PaginationBar'

const TRADES_PER_PAGE = 10

export default function OrderBookDepth({
  l2Data,
  trades = [],
  selectedSymbol,
  isLoading,
  onSelectPrice,
}) {
  const [activeTab, setActiveTab] = useState('DEPTH') // 'DEPTH' | 'TAPE'
  const [tradePage, setTradePage] = useState(1)
  const [prevSymbol, setPrevSymbol] = useState(selectedSymbol)

  // Reset pagination to page 1 when market changes
  if (selectedSymbol !== prevSymbol) {
    setPrevSymbol(selectedSymbol)
    setTradePage(1)
  }

  const bids = l2Data?.bids || []
  const asks = l2Data?.asks || []
  const spread = l2Data?.spread || 0
  const bestBid = l2Data?.best_bid || 0
  const bestAsk = l2Data?.best_ask || 0

  // Calculate max volume for relative depth bars
  const maxQty = Math.max(
    ...bids.map((b) => b.quantity || 0),
    ...asks.map((a) => a.quantity || 0),
    1
  )

  // Reverse asks so lowest ask is at the bottom (closest to spread)
  const displayAsks = [...asks].reverse()

  // Paginated trades slice (10 per page)
  const totalTrades = trades.length
  const totalTradePages = Math.max(1, Math.ceil(totalTrades / TRADES_PER_PAGE))
  const safeTradePage = Math.min(tradePage, totalTradePages)
  const tradeStartIdx = (safeTradePage - 1) * TRADES_PER_PAGE
  const tradeEndIdx = Math.min(tradeStartIdx + TRADES_PER_PAGE, totalTrades)
  const visibleTrades = trades.slice(tradeStartIdx, tradeStartIdx + TRADES_PER_PAGE)

  return (
    <div className="w-full h-full rounded-3xl spatial-glass p-5 sm:p-6 shadow-lg shadow-black/40 flex flex-col justify-between transition-all duration-300">
      
      {/* Top Header with Segmented Toggle Switch: [ Level-2 Depth | Recent Executions ] */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/20">
        
        {/* Segmented Tab Controls */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#171A23] border border-white/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
          <button
            type="button"
            onClick={() => setActiveTab('DEPTH')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-sans font-bold text-xs tracking-wide transition-all duration-300 cursor-pointer ${
              activeTab === 'DEPTH'
                ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 border border-[#D4AF37]/60 text-[#F5D061] shadow-[0_0_16px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]'
                : 'text-white/75 hover:text-white/90 hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Level-2 Depth</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TAPE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-sans font-bold text-xs tracking-wide transition-all duration-300 cursor-pointer ${
              activeTab === 'TAPE'
                ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 border border-[#D4AF37]/60 text-[#F5D061] shadow-[0_0_16px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]'
                : 'text-white/75 hover:text-white/90 hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Recent Executions</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-colors ${
              activeTab === 'TAPE'
                ? 'bg-[#D4AF37]/25 text-[#F5D061]'
                : 'bg-white/[0.06] text-white/75'
            }`}>
              {trades.length}
            </span>
          </button>
        </div>

        {/* Telemetry Status Pill */}
        {activeTab === 'DEPTH' ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[10px] font-mono text-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.15)]">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-[#F5D061]' : 'bg-[#22C55E]'}`} />
            <span className="font-semibold tracking-wide">{isLoading ? 'SYNCING...' : 'REAL-TIME L2 STREAM'}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-mono text-[#F5D061]">
            <Sparkles className="w-3 h-3" />
            <span className="font-semibold tracking-wide">
              SHOWING {totalTrades > 0 ? `${tradeStartIdx + 1}–${tradeEndIdx}` : 0} OF {totalTrades}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area (Expands cleanly to fill matched height) */}
      {activeTab === 'DEPTH' ? (
        <>
          <div className="flex-1 flex flex-col justify-between min-h-0">
            {/* Table Columns Title */}
            <div className="grid grid-cols-4 text-[10px] font-mono text-white/75 uppercase tracking-widest pb-2.5 px-3 border-b border-white/20">
              <span>Price (INR)</span>
              <span className="text-right">Tickets</span>
              <span className="text-right">Orders</span>
              <span className="text-right">Total Depth</span>
            </div>

            {/* ASKS (SELL ORDERS) - Luminous Red with Soft Floating Depth */}
            <div className="flex-1 space-y-0.5 py-2 min-h-[150px] max-h-[210px] overflow-y-auto flex flex-col justify-end pr-1">
              {displayAsks.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-white/75">
                  No resting sell asks on book
                </div>
              ) : (
                displayAsks.map((ask, idx) => {
                  const widthPct = Math.min(100, Math.round((ask.quantity / maxQty) * 100))
                  return (
                    <div
                      key={`ask-${ask.price}-${idx}`}
                      onClick={() => onSelectPrice?.(ask.price)}
                      className="relative grid grid-cols-4 text-xs font-mono py-2 px-3 rounded-xl hover:bg-white/[0.07] cursor-pointer transition-all duration-200 group"
                      title="Click to copy this price into your order form"
                    >
                      {/* Floating Depth Heatbar with Diffuse Glow */}
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#EF4444]/25 via-[#EF4444]/12 to-transparent rounded-r-xl pointer-events-none transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                        style={{ width: `${widthPct}%` }}
                      />

                      <span className="text-[#EF4444] font-bold relative z-10 group-hover:underline">
                        ₹{ask.price ? Number(ask.price).toLocaleString() : '0'}
                      </span>
                      
                      <span className="text-right text-white/90 font-medium relative z-10">
                        {ask.quantity || 0}
                      </span>
                      
                      <span className="text-right text-white/70 relative z-10 text-[11px]">
                        {ask.order_count || 1}
                      </span>
                      
                      <span className="text-right text-white/70 text-[11px] font-mono relative z-10">
                        ₹{((ask.price || 0) * (ask.quantity || 0)).toLocaleString()}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            {/* FLOATING MID-MARKET SPREAD SHELF */}
            <div className="my-2.5 py-3 px-4 rounded-2xl bg-white/[0.06] border border-white/20 flex items-center justify-between text-xs font-mono shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-2 text-[#D4AF37]">
                <Activity className="w-3.5 h-3.5 text-[#F5D061]" />
                <span className="text-[11px] font-semibold text-white/80">
                  Spread: <strong className="text-[#F5D061] font-bold">₹{(spread || 0).toLocaleString()}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/75">
                <span>Bid: <strong className="text-[#22C55E]">₹{bestBid > 0 ? Number(bestBid).toLocaleString() : '-'}</strong></span>
                <span>·</span>
                <span>Ask: <strong className="text-[#EF4444]">₹{bestAsk > 0 ? Number(bestAsk).toLocaleString() : '-'}</strong></span>
              </div>
            </div>

            {/* BIDS (BUY ORDERS) - Luminous Green with Soft Floating Depth */}
            <div className="flex-1 space-y-0.5 py-2 min-h-[150px] max-h-[210px] overflow-y-auto pr-1">
              {bids.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-white/75">
                  No resting buy bids on book
                </div>
              ) : (
                bids.map((bid, idx) => {
                  const widthPct = Math.min(100, Math.round(((bid.quantity || 1) / maxQty) * 100))
                  return (
                    <div
                      key={`bid-${bid.price}-${idx}`}
                      onClick={() => onSelectPrice?.(bid.price)}
                      className="relative grid grid-cols-4 text-xs font-mono py-2 px-3 rounded-xl hover:bg-white/[0.07] cursor-pointer transition-all duration-200 group"
                      title="Click to copy this price into your order form"
                    >
                      {/* Floating Depth Heatbar with Diffuse Glow */}
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#22C55E]/25 via-[#22C55E]/12 to-transparent rounded-r-xl pointer-events-none transition-all duration-300 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                        style={{ width: `${widthPct}%` }}
                      />

                      <span className="text-[#22C55E] font-bold relative z-10 group-hover:underline">
                        ₹{bid.price ? Number(bid.price).toLocaleString() : '0'}
                      </span>
                      
                      <span className="text-right text-white/90 font-medium relative z-10">
                        {bid.quantity || 0}
                      </span>
                      
                      <span className="text-right text-white/70 relative z-10 text-[11px]">
                        {bid.order_count || 1}
                      </span>
                      
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
          <div className="mt-auto pt-3 border-t border-white/20 flex items-center justify-between text-[10px] font-mono text-white/75">
            <span className="text-[#22C55E]/90 font-medium">● Bids ({bids.length} levels)</span>
            <span>Tip: Click any price row to fill order form</span>
            <span className="text-[#EF4444]/90 font-medium">● Asks ({asks.length} levels)</span>
          </div>
        </>
      ) : (
        /* TAB 2: RECENT EXECUTIONS (MARKET TRADE TAPE WITH PAGINATION) */
        <>
          <div className="flex-1 flex flex-col min-h-0">
            {/* Table Columns Title */}
            <div className="grid grid-cols-12 text-[10px] font-mono text-white/70 uppercase tracking-widest pb-2.5 px-3 border-b border-white/20">
              <span className="col-span-3">Ticket Price</span>
              <span className="col-span-2 text-right">Passes</span>
              <span className="col-span-3 text-center">Transfer Status</span>
              <span className="col-span-4 text-right">Sold On (Date & Time)</span>
            </div>

            {/* Paginated Trade List */}
            <div className="flex-1 space-y-1 py-2 min-h-[380px] max-h-[430px] overflow-y-auto pr-1">
              {trades.length === 0 ? (
                <div className="py-20 text-center text-xs font-mono text-white/75">
                  No tickets have been bought or sold on this market yet.
                </div>
              ) : (
                <>
                  {visibleTrades.map((trade, idx) => {
                    const rawTime = trade.executed_at || trade.timestamp
                    const tradeDateTime = rawTime
                      ? new Date(rawTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : 'Just now'
                    return (
                      <div
                        key={trade.id || trade.trade_id || `trade-${idx}`}
                        className="grid grid-cols-12 items-center text-xs font-mono py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/15 hover:border-white/25 transition-all duration-200"
                      >
                        <span className="col-span-3 text-[#22C55E] font-bold">
                          ₹{trade.price ? Number(trade.price).toLocaleString() : '0'}
                        </span>
                        <span className="col-span-2 text-right text-white/90 font-medium">
                          {trade.quantity} {Number(trade.quantity) === 1 ? 'pass' : 'passes'}
                        </span>
                        <span className="col-span-3 flex items-center justify-center gap-1 text-[10px] text-[#F5D061]/85">
                          <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                          <span>Verified QR</span>
                        </span>
                        <span className="col-span-4 text-right text-white/75 text-[11px] whitespace-nowrap">
                          {tradeDateTime}
                        </span>
                      </div>
                    )
                  })}

                </>
              )}
            </div>
          </div>

          {/* Sliding 5-Page Numbered Pagination Footer */}
          {totalTrades > 0 ? (
            <div className="mt-auto">
              <PaginationBar
                currentPage={safeTradePage}
                totalItems={totalTrades}
                pageSize={TRADES_PER_PAGE}
                itemLabel="executions"
                onPageChange={setTradePage}
                compact
              />
            </div>
          ) : (
            <div className="mt-auto pt-3 border-t border-white/20 flex items-center justify-between text-[10px] font-mono text-white/75">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>Completed ticket sales with instant QR pass transfer & verified ownership</span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
