import React from 'react'
import {
  Zap,
  ShieldCheck,
  Calendar,
  ChevronDown,
  Activity,
} from 'lucide-react'

export default function MarketHeader({
  events = [],
  selectedEvent,
  onSelectEvent,
  spread = 0,
  bestBid = 0,
  bestAsk = 0,
  telemetry,
}) {
  if (!selectedEvent) return null

  const faceValue = selectedEvent.face_value || 0
  const maxSellPrice = selectedEvent.max_sell_price || 0
  const markupPct = selectedEvent.max_markup_percentage
    ? Math.round(selectedEvent.max_markup_percentage * 100)
    : 20

  const p50 = telemetry?.latency_metrics?.p50_latency || '< 0.40ms'
  const p99 = telemetry?.latency_metrics?.p99_latency || '< 1.10ms'

  const formattedDate = selectedEvent.event_date
    ? new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'TBA'

  return (
    <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden transition-all duration-300">
      {/* Background subtle glowing flare */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        {/* Left: Market Selector Dropdown & Event Metadata */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white/50 mb-1.5">
              Active Secondary Market
            </label>
            <div className="relative inline-block">
              <select
                value={selectedEvent?.symbol || ''}
                onChange={(e) => {
                  const evt = (events || []).find((item) => item.symbol === e.target.value)
                  if (evt) onSelectEvent(evt)
                }}
                className="appearance-none bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#D4AF37]/60 text-white font-cinzel font-bold text-base sm:text-lg rounded-2xl px-4 py-2.5 pr-10 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 cursor-pointer transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                {(events || []).map((evt) => (
                  <option key={evt.id || evt.symbol} value={evt.symbol} className="bg-[#14100E] text-white">
                    {evt.name} ({evt.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#D4AF37] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Event Badge & Live Status Pill */}
          <div className="flex items-center gap-2 pt-4 sm:pt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-[#D4AF37] shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Calendar className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>{formattedDate}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 text-xs font-mono text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="font-semibold tracking-wide">MARKET LIVE</span>
            </span>
          </div>
        </div>

        {/* Center: Anti-Scalper Dynamic Price Collar Specs (Floating Modular Pills with Rim Lighting) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto font-mono text-xs">
          
          {/* Face Value Pill */}
          <div className="px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1 font-mono">
              Face Value
            </span>
            <span className="text-white font-bold text-sm tracking-wide font-mono">
              ₹{(faceValue || 0).toLocaleString()}
            </span>
          </div>

          {/* Dynamic Collar Ceiling Pill */}
          <div className="px-4 py-3 rounded-2xl bg-gradient-to-b from-[#D4AF37]/15 to-[#D4AF37]/5 border border-[#D4AF37]/40 hover:border-[#D4AF37]/70 shadow-[0_4px_20px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#F5D061] block text-[10px] tracking-wider uppercase font-semibold font-mono">
                Collar Cap (+{markupPct}%)
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#F5D061]" />
            </div>
            <span className="text-[#F5D061] font-bold text-sm font-mono tracking-wide">
              ₹{(maxSellPrice || 0).toLocaleString()} Max
            </span>
          </div>

          {/* Mid-Market Spread Pill */}
          <div className="col-span-2 sm:col-span-1 px-4 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 transition-all duration-300">
            <span className="text-white/40 block text-[10px] tracking-widest uppercase mb-1 font-mono">
              Spread
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm font-mono">
                ₹{spread > 0 ? Math.round(spread).toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                ({bestBid > 0 ? `₹${bestBid}` : '-'} / {bestAsk > 0 ? `₹${bestAsk}` : '-'})
              </span>
            </div>
          </div>
        </div>

        {/* Right: High-Speed Engine Performance Telemetry */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 border-white/[0.08] pt-3 lg:pt-0">
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[10px] font-mono text-[#F5D061] shadow-[0_0_12px_rgba(212,175,55,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Zap className="w-3 h-3 text-[#F5D061]" />
              <span className="font-semibold tracking-wider">HIGH-SPEED ENGINE</span>
            </div>
            <div className="text-[11px] font-mono text-white/50 mt-1.5">
              Latency: <span className="text-[#22C55E] font-bold">{p50}</span> · Peak:{' '}
              <span className="text-[#F5D061] font-bold">{p99}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
