import React from 'react'
import {
  Zap,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronDown,
  Activity,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function MarketHeader({
  events,
  selectedEvent,
  onSelectEvent,
  spread,
  bestBid,
  bestAsk,
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
    <div className="rounded-2xl gloss-panel border border-[#D4AF37]/30 p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.8)] relative overflow-hidden">
      {/* Background subtle glowing flare */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Market Selector Dropdown & Event Metadata */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#9E9689] mb-1">
              Active Secondary Market
            </label>
            <div className="relative inline-block">
              <select
                value={selectedEvent.symbol}
                onChange={(e) => {
                  const evt = events.find((item) => item.symbol === e.target.value)
                  if (evt) onSelectEvent(evt)
                }}
                className="appearance-none bg-[#14100E] border border-[#D4AF37]/50 text-white font-cinzel font-bold text-base sm:text-lg rounded-xl px-4 py-2 pr-10 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] cursor-pointer hover:bg-[#1B1512] transition-colors shadow-[0_0_15px_rgba(212,175,55,0.15)]"
              >
                {events.map((evt) => (
                  <option key={evt.id || evt.symbol} value={evt.symbol} className="bg-[#14100E] text-white">
                    {evt.name} ({evt.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#D4AF37] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Event Badge & Date */}
          <div className="flex items-center gap-2 pt-4 sm:pt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181310] border border-[#3A2E26] text-xs font-mono text-[#D4AF37]">
              <Calendar className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>{formattedDate}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181310] border border-[#22C55E]/30 text-xs font-mono text-[#22C55E]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span>MARKET LIVE</span>
            </span>
          </div>
        </div>

        {/* Center: Anti-Scalper Dynamic Price Collar Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto font-mono text-xs">
          {/* Face Value */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0D0B0A] border border-[#241E19]">
            <span className="text-[#8E867A] block text-[10px] tracking-wider uppercase mb-0.5">
              Face Value
            </span>
            <span className="text-white font-bold text-sm">
              ₹{faceValue.toLocaleString()}
            </span>
          </div>

          {/* Dynamic Collar Ceiling */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0D0B0A] border border-[#D4AF37]/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[#D4AF37] block text-[10px] tracking-wider uppercase font-semibold">
                Collar Cap (+{markupPct}%)
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#F5D061]" />
            </div>
            <span className="text-[#F5D061] font-bold text-sm">
              ₹{maxSellPrice.toLocaleString()} Max
            </span>
          </div>

          {/* Mid-Market Spread */}
          <div className="col-span-2 sm:col-span-1 px-3.5 py-2.5 rounded-xl bg-[#0D0B0A] border border-[#241E19]">
            <span className="text-[#8E867A] block text-[10px] tracking-wider uppercase mb-0.5">
              Spread
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">
                ₹{spread > 0 ? Math.round(spread).toLocaleString() : '0'}
              </span>
              <span className="text-[10px] text-[#A39B8E]">
                ({bestBid > 0 ? `₹${bestBid}` : '-'} / {bestAsk > 0 ? `₹${bestAsk}` : '-'})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Sub-10ms Engine Performance Telemetry */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 border-[#2A211B] pt-3 lg:pt-0">
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18120E] border border-[#D4AF37]/30 text-[10px] font-mono text-[#D4AF37]">
              <Zap className="w-3 h-3 text-[#F5D061]" />
              <span>SUB-10MS ENGINE</span>
            </div>
            <div className="text-[11px] font-mono text-[#8E867A] mt-1">
              p50: <span className="text-[#22C55E] font-bold">{p50}</span> · p99:{' '}
              <span className="text-[#F5D061] font-bold">{p99}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
