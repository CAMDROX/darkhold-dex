import React, { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Zap,
  Clock,
  ShieldCheck,
  Flame,
  ArrowRight,
  Play,
  RefreshCw,
  BarChart2,
  Activity,
} from 'lucide-react'

export default function HeroPreviewWidget() {
  const [bids, setBids] = useState([
    { id: 'b1', price: 2250, qty: 2, user: 'Arjun Kapoor', time: '18:24:09' },
    { id: 'b2', price: 2200, qty: 1, user: 'Ananya Iyer', time: '18:21:08' },
    { id: 'b3', price: 2150, qty: 3, user: 'Vikram Mehta', time: '18:15:06' },
    { id: 'b4', price: 2100, qty: 1, user: 'Priya Nair', time: '18:10:44' },
    { id: 'b5', price: 2050, qty: 2, user: 'Rahul Verma', time: '18:05:12' },
  ])

  const [asks, setAsks] = useState([
    { id: 'a1', price: 2300, qty: 1, user: 'Sneha Rao', time: '18:21:08' },
    { id: 'a2', price: 2350, qty: 2, user: 'Rohan Das', time: '18:18:20' },
    { id: 'a3', price: 2400, qty: 1, user: 'Kavya Sen', time: '18:12:00' },
    { id: 'a4', price: 2450, qty: 4, user: 'Aditya Joshi', time: '18:08:19' },
    { id: 'a5', price: 2500, qty: 2, user: 'Dev Malhotra', time: '18:01:50' },
  ])

  const [recentTrades, setRecentTrades] = useState([
    { id: 2, time: '18:24:09', price: 2300, qty: 1, buyer: 'Arjun Kapoor', seller: 'Sneha Rao' },
    { id: 1, time: '18:21:08', price: 2300, qty: 1, buyer: 'Ananya Iyer', seller: 'Sneha Rao' },
  ])

  const [activityFeed, setActivityFeed] = useState([
    { id: 1, time: '18:33:12', msg: 'Ananya Iyer bought limit @ ₹2,200: 0/1 filled, 1 resting', type: 'info' },
    { id: 2, time: '18:33:11', msg: 'Demo market seeded for Summer Music Festival', type: 'neutral' },
    { id: 3, time: '18:33:11', msg: 'Sneha Rao opened AUC-001: 2 ticket(s) from ₹2,500 down to ₹2,000', type: 'auction' },
    { id: 4, time: '18:30:11', msg: 'Sneha Rao sold limit @ ₹2,350: 0/1 filled, 1 resting', type: 'info' },
    { id: 5, time: '18:27:10', msg: 'Sneha Rao bought limit @ ₹2,250: 0/2 filled, 2 resting', type: 'info' },
    { id: 6, time: '18:24:09', msg: 'Arjun Kapoor bought at market: 1/1 filled @ ₹2,300', type: 'success' },
  ])

  const [bannerAlert, setBannerAlert] = useState(null)

  // Face Value & Collar Specs
  const FACE_VALUE = 2000
  const MAX_COLLAR_PRICE = 2500 // +25% ceiling
  const bestBid = bids.length > 0 ? bids[0].price : 2250
  const bestAsk = asks.length > 0 ? asks[0].price : 2300
  const spread = bestAsk - bestBid

  // Simulate Scalper Bot Attack
  const handleScalperAttack = () => {
    const attemptedPrice = 8500
    const now = new Date().toLocaleTimeString('en-GB')
    
    setBannerAlert({
      type: 'scalper_blocked',
      title: 'PRICE CAP CHECK: LISTING REJECTED',
      details: `Scalper bot attempted to post ask @ ₹${attemptedPrice.toLocaleString()} (Face Value ₹${FACE_VALUE.toLocaleString()}). Dynamic price collar ceiling is capped at ₹${MAX_COLLAR_PRICE.toLocaleString()} (+25%). In-memory collar gate dropped order with status 422 Unprocessable Entity!`,
      latency: '0.4ms',
    })

    setActivityFeed((prev) => [
      {
        id: Date.now(),
        time: now,
        msg: `[BLOCKED: HTTP 422] Scalper bot ask ₹8,500 rejected by dynamic price collar (Max cap: ₹2,500)`,
        type: 'alert',
      },
      ...prev.slice(0, 7),
    ])
  }

  // Simulate Fair Fan Buy Order (FIFO Execution)
  const handleFairOrder = () => {
    const orderPrice = 2300
    const now = new Date().toLocaleTimeString('en-GB')

    setBannerAlert({
      type: 'fair_matched',
      title: 'ORDER MATCHED: INSTANT SETTLEMENT',
      details: `Fair Fan limit order matched immediately with resting ask @ ₹${orderPrice.toLocaleString()} in 3.4ms. Atomic double-entry escrow locked until ticket token verified!`,
      latency: '3.4ms',
    })

    const newTrade = {
      id: recentTrades.length + 1,
      time: now,
      price: orderPrice,
      qty: 1,
      buyer: 'You (Verified Buyer)',
      seller: asks[0]?.user || 'Sneha Rao',
    }

    setRecentTrades((prev) => [newTrade, ...prev.slice(0, 5)])

    setActivityFeed((prev) => [
      {
        id: Date.now(),
        time: now,
        msg: `Fan_8829 bought at market: 1/1 filled @ ₹${orderPrice} in 3.4ms (Atomic Settlement)`,
        type: 'success',
      },
      ...prev.slice(0, 7),
    ])
  }

  const handleReset = () => {
    setBannerAlert(null)
  }

  return (
    <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-6 sm:-mt-8 mb-20 z-20">
      
      {/* Ambient Atmospheric Cones */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Container Frame with Golden Arcane Border & Spatial Glass */}
      <div className="relative rounded-3xl spatial-glass border border-white/20 shadow-xl shadow-black/40 overflow-hidden transition-all duration-300">
        
        {/* Top Header Bar mirroring Spatial Cockpit */}
        <div className="px-5 py-4 border-b border-white/20 bg-[#181B24] backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-sm sm:text-base tracking-wider text-white">
                  Summer Music Festival — General Admission
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D061] rounded-full shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                  DEMO MODE
                </span>
              </div>
              <p className="text-xs font-mono text-white/75 mt-0.5">
                Main Stage Arena · Face Value <span className="text-[#F5D061] font-semibold">₹2,000.00</span> · Dynamic Collar Cap <span className="text-rose-400 font-semibold">₹2,500.00</span> (+25%)
              </p>
            </div>
          </div>

          {/* Interactive Playground Control Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleScalperAttack}
              className="px-4 py-2 rounded-xl text-xs font-mono font-medium tracking-wide bg-rose-500/15 border border-rose-500/50 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)] cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Simulate Scalper Bot (₹8,500)</span>
            </button>

            <button
              onClick={handleFairOrder}
              className="px-4 py-2 rounded-xl text-xs font-mono font-medium tracking-wide bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.2)] cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Submit Fair Buy (₹2,300)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Engine Notification Alert Banner */}
        {bannerAlert && (
          <div className={`px-5 py-3.5 border-b transition-all flex items-start justify-between gap-3 animate-spatial-pop ${
            bannerAlert.type === 'scalper_blocked' 
              ? 'bg-rose-950/60 border-rose-500/50 text-rose-200' 
              : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
          }`}>
            <div className="flex items-start gap-3">
              {bannerAlert.type === 'scalper_blocked' ? (
                <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              )}
              <div>
                <div className="font-mono text-xs font-bold tracking-wider flex items-center gap-2">
                  <span>{bannerAlert.title}</span>
                  <span className="px-2 py-0.5 bg-[#1B1F29] border border-white/20 rounded text-[10px] font-mono">
                    LATENCY: {bannerAlert.latency}
                  </span>
                </div>
                <p className="text-xs mt-1 text-white/80 font-light leading-relaxed">
                  {bannerAlert.details}
                </p>
              </div>
            </div>
            <button 
              onClick={handleReset} 
              className="text-xs font-mono opacity-70 hover:opacity-100 px-2.5 py-1 rounded-lg bg-[#181B24] hover:bg-[#1E222E] border border-white/20 transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Ticker Stats Grid - Sunken Spatial Compartments */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y lg:divide-y-0 divide-white/15 bg-[#171A23] border-b border-white/20">
          
          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">BEST BID</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-emerald-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.3)]">
              ₹{(bestBid || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">BEST ASK</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              ₹{(bestAsk || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">SPREAD</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#F5D061]">
              ₹{(spread || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">LAST TRADE</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              ₹2,300
            </span>
            <span className="text-[10px] font-mono text-white/75 block">₹0.00</span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">ACTIVE BIDS</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {bids.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">ACTIVE ASKS</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {asks.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 hover:bg-white/[0.05] transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-white/75 block mb-1">TRADES</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {recentTrades.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors">
            <span className="text-[10px] font-mono tracking-widest text-[#F5D061] block mb-1 font-semibold">WALLET BALANCE</span>
            <span className="text-base sm:text-lg font-mono font-bold text-white">
              ₹49,000.00
            </span>
            <span className="text-[10px] font-mono text-white/75 block">
              Reserved ₹8,700.00
            </span>
          </div>

        </div>

        {/* Two-Column Interior View: Level 2 Orderbook Ladder & Market Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/15">
          
          {/* Left Column: Order Book & Trades Ladder */}
          <div className="lg:col-span-7 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="font-sans font-bold text-sm tracking-wide text-[#F5D061]">
                  Level 2 In-Memory Order Book
                </h3>
              </div>
              <span className="text-xs font-mono text-white/75">
                Dynamic Collar: Max ₹2,500.00
              </span>
            </div>

            {/* Depth Ladder */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Bids Ladder (Emerald) */}
              <div className="bg-[#181B24] border border-white/20 rounded-2xl p-3.5 shadow-inner">
                <div className="flex justify-between text-[11px] font-mono text-white/75 pb-2 border-b border-white/20">
                  <span>PRICE (₹)</span>
                  <span>QTY</span>
                  <span>USER</span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {bids.map((b) => (
                    <div key={b.id} className="relative flex justify-between items-center text-xs font-mono py-1 px-2 rounded hover:bg-emerald-500/10 transition-colors">
                      <span className="text-emerald-400 font-semibold relative z-10">₹{b.price}</span>
                      <span className="text-white/90 relative z-10">{b.qty}</span>
                      <span className="text-white/75 text-[10px] truncate max-w-[70px] relative z-10">{b.user}</span>
                      {/* Depth visualization bar */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-emerald-500/20 to-transparent rounded-r pointer-events-none"
                        style={{ width: `${(b.qty / 5) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks Ladder (Crimson) */}
              <div className="bg-[#181B24] border border-white/20 rounded-2xl p-3.5 shadow-inner">
                <div className="flex justify-between text-[11px] font-mono text-white/75 pb-2 border-b border-white/20">
                  <span>PRICE (₹)</span>
                  <span>QTY</span>
                  <span>USER</span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {asks.map((a) => (
                    <div key={a.id} className="relative flex justify-between items-center text-xs font-mono py-1 px-2 rounded hover:bg-rose-500/10 transition-colors">
                      <span className="text-rose-400 font-semibold relative z-10">₹{a.price}</span>
                      <span className="text-white/90 relative z-10">{a.qty}</span>
                      <span className="text-white/75 text-[10px] truncate max-w-[70px] relative z-10">{a.user}</span>
                      {/* Depth visualization bar */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-rose-500/20 to-transparent rounded-r pointer-events-none"
                        style={{ width: `${(a.qty / 5) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Trades Table */}
            <div>
              <h4 className="text-xs font-sans font-semibold text-[#D4AF37] mb-2.5">
                Recent Executions (Double-Entry Ledger Settled)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-white/20 bg-[#181B24]">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/20 text-white/75 bg-[#181B24]">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">TIME</th>
                      <th className="py-2 px-3">PRICE</th>
                      <th className="py-2 px-3">QTY</th>
                      <th className="py-2 px-3">BUYER</th>
                      <th className="py-2 px-3">SELLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/15">
                    {recentTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.06] transition-colors">
                        <td className="py-2 px-3 text-white/75">{t.id}</td>
                        <td className="py-2 px-3 text-white/75">{t.time}</td>
                        <td className="py-2 px-3 text-emerald-400 font-semibold">₹{(t.price ? Number(t.price).toLocaleString() : '0')}</td>
                        <td className="py-2 px-3 text-white font-bold">{t.qty}</td>
                        <td className="py-2 px-3 text-white/80">{t.buyer}</td>
                        <td className="py-2 px-3 text-white/75">{t.seller}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: Live Market Activity Stream */}
          <div className="lg:col-span-5 p-4 sm:p-6 bg-[#181B24] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-white/20 mb-3.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-sans font-bold text-sm tracking-wide text-white">
                    Market Activity Feed
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.15)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  WS Live Stream
                </span>
              </div>

              {/* Feed items */}
              <div className="space-y-2.5 font-mono text-xs">
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all duration-300 ${
                      item.type === 'alert'
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                        : item.type === 'success'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                        : item.type === 'auction'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,208,97,0.1)]'
                        : 'bg-[#171A23] border-white/20 text-white/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-white/75 mb-1">
                      <span>{item.time}</span>
                      <span className="uppercase tracking-widest text-[9px] text-white/75 font-bold">
                        {item.type}
                      </span>
                    </div>
                    <p className="leading-snug">{item.msg}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Proof Note */}
            <div className="mt-5 pt-3.5 border-t border-white/20 text-[11px] text-white/75 font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                In-Memory Matcher: Lock-Free Go
              </span>
              <a href="#simulator" className="text-[#F5D061] hover:text-white transition-colors flex items-center gap-1 font-semibold">
                Open Full Simulator <ArrowRight className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>

      </div>

    </section>
  )
}
