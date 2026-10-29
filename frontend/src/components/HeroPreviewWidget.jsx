import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert, Zap, Clock, ShieldCheck, Flame, ArrowRight, Play, RefreshCw, BarChart2, Activity } from 'lucide-react'

export default function HeroPreviewWidget() {
  const [bids, setBids] = useState([
    { id: 'b1', price: 2250, qty: 2, user: 'Corvin Ash', time: '18:24:09' },
    { id: 'b2', price: 2200, qty: 1, user: 'Morgana Vale', time: '18:21:08' },
    { id: 'b3', price: 2150, qty: 3, user: 'Kaelen Voss', time: '18:15:06' },
    { id: 'b4', price: 2100, qty: 1, user: 'Aurelia Nox', time: '18:10:44' },
    { id: 'b5', price: 2050, qty: 2, user: 'Zephyr Dune', time: '18:05:12' },
  ])

  const [asks, setAsks] = useState([
    { id: 'a1', price: 2300, qty: 1, user: 'Vesper Thorn', time: '18:21:08' },
    { id: 'a2', price: 2350, qty: 2, user: 'Damian Black', time: '18:18:20' },
    { id: 'a3', price: 2400, qty: 1, user: 'Nyx Shadow', time: '18:12:00' },
    { id: 'a4', price: 2450, qty: 4, user: 'Valeria Frost', time: '18:08:19' },
    { id: 'a5', price: 2500, qty: 2, user: 'Ignis Sol', time: '18:01:50' },
  ])

  const [recentTrades, setRecentTrades] = useState([
    { id: 2, time: '18:24:09', price: 2300, qty: 1, buyer: 'Corvin Ash', seller: 'Vesper Thorn' },
    { id: 1, time: '18:21:08', price: 2300, qty: 1, buyer: 'Morgana Vale', seller: 'Vesper Thorn' },
  ])

  const [activityFeed, setActivityFeed] = useState([
    { id: 1, time: '18:33:12', msg: 'Morgana Vale bought limit @ ₹2,200: 0/1 filled, 1 resting', type: 'info' },
    { id: 2, time: '18:33:11', msg: 'Demo market seeded for Eclipse Festival', type: 'neutral' },
    { id: 3, time: '18:33:11', msg: 'Vesper Thorn opened AUC-001: 2 ticket(s) from ₹2,500 down to ₹2,000', type: 'auction' },
    { id: 4, time: '18:30:11', msg: 'Vesper Thorn sold limit @ ₹2,350: 0/1 filled, 1 resting', type: 'info' },
    { id: 5, time: '18:27:10', msg: 'Vesper Thorn bought limit @ ₹2,250: 0/2 filled, 2 resting', type: 'info' },
    { id: 6, time: '18:24:09', msg: 'Corvin Ash bought at market: 1/1 filled @ ₹2,300', type: 'success' },
  ])

  const [bannerAlert, setBannerAlert] = useState(null)
  const [activeTab, setActiveTab] = useState('orderbook') // 'orderbook' | 'trades'

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
      title: '🚨 PREDATORY SCALPER ATTACK REJECTED',
      details: `Scalper bot attempted to post ask @ ₹${attemptedPrice.toLocaleString()} (Face Value ₹${FACE_VALUE.toLocaleString()}). Dynamic price collar ceiling is capped at ₹${MAX_COLLAR_PRICE.toLocaleString()} (+25%). In-memory collar gate dropped order with status 422 Unprocessable Entity!`,
      latency: '0.4ms',
    })

    setActivityFeed(prev => [
      {
        id: Date.now(),
        time: now,
        msg: `[BLOCKED: HTTP 422] Scalper bot ask ₹8,500 rejected by dynamic price collar (Max cap: ₹2,500)`,
        type: 'alert'
      },
      ...prev.slice(0, 7)
    ])
  }

  // Simulate Fair Fan Buy Order (FIFO Execution)
  const handleFairOrder = () => {
    const orderPrice = 2300
    const now = new Date().toLocaleTimeString('en-GB')

    setBannerAlert({
      type: 'fair_matched',
      title: '⚡ FIFO IN-MEMORY MATCH EXECUTED',
      details: `Fair Fan limit order matched immediately with resting ask @ ₹${orderPrice.toLocaleString()} in 3.4ms. Atomic double-entry escrow locked until ticket token verified!`,
      latency: '3.4ms',
    })

    const newTrade = {
      id: recentTrades.length + 1,
      time: now,
      price: orderPrice,
      qty: 1,
      buyer: 'Fan_8829 (You)',
      seller: asks[0]?.user || 'Vesper Thorn'
    }

    setRecentTrades(prev => [newTrade, ...prev.slice(0, 5)])

    setActivityFeed(prev => [
      {
        id: Date.now(),
        time: now,
        msg: `Fan_8829 bought at market: 1/1 filled @ ₹${orderPrice} in 3.4ms (Atomic Settlement)`,
        type: 'success'
      },
      ...prev.slice(0, 7)
    ])
  }

  // Reset demo state
  const handleReset = () => {
    setBannerAlert(null)
  }

  return (
    <section className="relative -mt-6 sm:-mt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-20 pb-20">
      
      {/* Container Frame with Golden Arcane Border & Glossy Glass */}
      <div className="relative rounded-2xl gloss-panel border border-[#D4AF37]/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(212,175,55,0.1)] overflow-hidden">
        
        {/* Top Header Bar mirroring Lovable dashboard reference */}
        <div className="px-5 py-4 border-b border-[#28211C] bg-[#110D0B]/80 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel font-bold text-sm sm:text-base tracking-wider text-white">
                  Eclipse Festival — General Admission
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F5D061] rounded">
                  DEMO MODE
                </span>
              </div>
              <p className="text-xs font-mono text-[#9B9487]">
                Obsidian Fields · Face Value <span className="text-[#F5D061] font-semibold">₹2,000.00</span> · Dynamic Collar Cap <span className="text-[#EF4444] font-semibold">₹2,500.00</span> (+25%)
              </p>
            </div>
          </div>

          {/* Interactive Playground Control Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleScalperAttack}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide bg-[#EF4444]/20 border border-[#EF4444]/60 text-[#FCA5A5] hover:bg-[#EF4444]/30 hover:border-[#EF4444] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />
              <span>Simulate Scalper Bot (₹8,500)</span>
            </button>

            <button
              onClick={handleFairOrder}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium tracking-wide bg-[#22C55E]/20 border border-[#22C55E]/60 text-[#86EFAC] hover:bg-[#22C55E]/30 hover:border-[#22C55E] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.2)] cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Submit Fair Buy (₹2,300)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Engine Notification Alert Banner */}
        {bannerAlert && (
          <div className={`px-5 py-3 border-b transition-all flex items-start justify-between gap-3 ${
            bannerAlert.type === 'scalper_blocked' 
              ? 'bg-[#291010]/95 border-[#EF4444]/60 text-red-200' 
              : 'bg-[#0E2314]/95 border-[#22C55E]/60 text-green-200'
          }`}>
            <div className="flex items-start gap-3">
              {bannerAlert.type === 'scalper_blocked' ? (
                <ShieldAlert className="w-5 h-5 text-[#EF4444] mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] mt-0.5 shrink-0" />
              )}
              <div>
                <div className="font-mono text-xs font-bold tracking-wider flex items-center gap-2">
                  <span>{bannerAlert.title}</span>
                  <span className="px-1.5 py-0.2 bg-black/40 rounded text-[10px] font-mono">
                    LATENCY: {bannerAlert.latency}
                  </span>
                </div>
                <p className="text-xs mt-1 text-[#E5E0D8]/90 font-light leading-relaxed">
                  {bannerAlert.details}
                </p>
              </div>
            </div>
            <button 
              onClick={handleReset} 
              className="text-xs font-mono opacity-70 hover:opacity-100 px-2 py-1 rounded bg-black/30 hover:bg-black/50"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Ticker Stats Grid - Exact structure from user's screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y lg:divide-y-0 divide-[#241E19] bg-[#0E0B09]/90 border-b border-[#241E19]">
          
          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">BEST BID</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#22C55E]">
              ₹{bestBid.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">BEST ASK</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#EF4444]">
              ₹{bestAsk.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">SPREAD</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-[#F5D061]">
              ₹{spread.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">LAST TRADE</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              ₹2,300
            </span>
            <span className="text-[10px] font-mono text-[#8E867A] block">₹0.00</span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">ACTIVE BIDS</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {bids.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">ACTIVE ASKS</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {asks.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4">
            <span className="text-[10px] font-mono tracking-wider text-[#8E867A] block mb-1">TRADES</span>
            <span className="text-lg sm:text-xl font-mono font-bold text-white">
              {recentTrades.length}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 bg-[#140F0D]/60">
            <span className="text-[10px] font-mono tracking-wider text-[#D4AF37] block mb-1">MORGANA CASH</span>
            <span className="text-base sm:text-lg font-mono font-bold text-white">
              ₹49,000.00
            </span>
            <span className="text-[10px] font-mono text-[#8E867A] block">
              Reserved ₹8,700.00
            </span>
          </div>

        </div>

        {/* Two-Column Interior View: Level 2 Orderbook Ladder & Market Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#241E19]">
          
          {/* Left Column: Order Book & Trades Ladder */}
          <div className="lg:col-span-7 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="font-cinzel font-bold text-sm tracking-wide text-[#E5C378]">
                  Level 2 In-Memory Order Book
                </h3>
              </div>
              <span className="text-xs font-mono text-[#8E867A]">
                Dynamic Collar: Max ₹2,500.00
              </span>
            </div>

            {/* Depth Ladder */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Bids Ladder (Emerald) */}
              <div className="bg-[#0B0908]/70 border border-[#241E19] rounded-xl p-3">
                <div className="flex justify-between text-[11px] font-mono text-[#8E867A] pb-2 border-b border-[#1E1916]">
                  <span>PRICE (₹)</span>
                  <span>QTY</span>
                  <span>USER</span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {bids.map((b) => (
                    <div key={b.id} className="relative flex justify-between items-center text-xs font-mono py-1 px-1.5 rounded hover:bg-emerald-950/20">
                      <span className="text-[#22C55E] font-semibold">₹{b.price}</span>
                      <span className="text-[#D1C9BE]">{b.qty}</span>
                      <span className="text-[#7A7367] text-[10px] truncate max-w-[70px]">{b.user}</span>
                      {/* Depth visualization bar */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-[#22C55E]/10 rounded pointer-events-none"
                        style={{ width: `${(b.qty / 5) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks Ladder (Crimson) */}
              <div className="bg-[#0B0908]/70 border border-[#241E19] rounded-xl p-3">
                <div className="flex justify-between text-[11px] font-mono text-[#8E867A] pb-2 border-b border-[#1E1916]">
                  <span>PRICE (₹)</span>
                  <span>QTY</span>
                  <span>USER</span>
                </div>
                <div className="space-y-1.5 mt-2">
                  {asks.map((a) => (
                    <div key={a.id} className="relative flex justify-between items-center text-xs font-mono py-1 px-1.5 rounded hover:bg-red-950/20">
                      <span className="text-[#EF4444] font-semibold">₹{a.price}</span>
                      <span className="text-[#D1C9BE]">{a.qty}</span>
                      <span className="text-[#7A7367] text-[10px] truncate max-w-[70px]">{a.user}</span>
                      {/* Depth visualization bar */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-[#EF4444]/10 rounded pointer-events-none"
                        style={{ width: `${(a.qty / 5) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Trades Table */}
            <div>
              <h4 className="text-xs font-cinzel font-semibold text-[#D4AF37] mb-2">
                Recent Executions (Double-Entry Ledger Settled)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#241E19] text-[#7A7367]">
                      <th className="py-1.5">#</th>
                      <th className="py-1.5">TIME</th>
                      <th className="py-1.5">PRICE</th>
                      <th className="py-1.5">QTY</th>
                      <th className="py-1.5">BUYER</th>
                      <th className="py-1.5">SELLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1412]">
                    {recentTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-[#1C1714]/40">
                        <td className="py-1.5 text-[#7A7367]">{t.id}</td>
                        <td className="py-1.5 text-[#9B9487]">{t.time}</td>
                        <td className="py-1.5 text-[#22C55E] font-semibold">₹{t.price.toLocaleString()}</td>
                        <td className="py-1.5 text-white">{t.qty}</td>
                        <td className="py-1.5 text-[#D1C9BE]">{t.buyer}</td>
                        <td className="py-1.5 text-[#9B9487]">{t.seller}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: Live Market Activity Stream */}
          <div className="lg:col-span-5 p-4 sm:p-5 bg-[#090706]/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#241E19] mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="font-cinzel font-bold text-sm tracking-wide text-[#E5C378]">
                    Market Activity Feed
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[#22C55E] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  WS Live Stream
                </span>
              </div>

              {/* Feed items */}
              <div className="space-y-2.5 font-mono text-xs">
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      item.type === 'alert'
                        ? 'bg-[#291010]/80 border-[#EF4444]/40 text-[#FCA5A5]'
                        : item.type === 'success'
                        ? 'bg-[#0E2314]/80 border-[#22C55E]/40 text-[#86EFAC]'
                        : item.type === 'auction'
                        ? 'bg-[#2A200B]/80 border-[#D4AF37]/40 text-[#FDE047]'
                        : 'bg-[#14100E]/70 border-[#221B17] text-[#C2BCB0]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#8E867A] mb-1">
                      <span>{item.time}</span>
                      <span className="uppercase tracking-widest text-[9px] text-[#A39E93]">
                        {item.type}
                      </span>
                    </div>
                    <p className="leading-snug">{item.msg}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Proof Note */}
            <div className="mt-4 pt-3 border-t border-[#241E19] text-[11px] text-[#8E867A] font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                In-Memory Matcher: Lock-Free Go
              </span>
              <a href="#simulator" className="text-[#D4AF37] hover:underline flex items-center gap-1">
                Open Full Simulator <ArrowRight className="w-3 h-3" />
              </a>
            </div>

          </div>

        </div>

      </div>

    </section>
  )
}
