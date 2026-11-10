import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
  Terminal,
} from 'lucide-react'

export default function InteractiveSimulator() {
  const [activeTab, setActiveTab] = useState('collar') // 'collar' | 'dutch' | 'fifo'

  // --- 1. Dynamic Collar Sandbox State ---
  const [faceValue, setFaceValue] = useState(2000)
  const [collarPercent, setCollarPercent] = useState(25)
  const [testOrderPrice, setTestOrderPrice] = useState(2400)
  const [collarResult, setCollarResult] = useState(null)

  const maxCollarPrice = faceValue * (1 + collarPercent / 100)
  const isViolating = testOrderPrice > maxCollarPrice

  const handleTestCollar = () => {
    if (isViolating) {
      setCollarResult({
        status: 'REJECTED',
        code: 422,
        message: `COLLAR_BREACH: Order price ₹${testOrderPrice.toLocaleString()} exceeds dynamic ceiling of ₹${maxCollarPrice.toLocaleString()} (+${collarPercent}% of ₹${faceValue.toLocaleString()}). Order was dropped by Go in-memory pre-matching collar gate in 0.3ms.`,
      })
    } else {
      setCollarResult({
        status: 'ACCEPTED',
        code: 200,
        message: `VALID_ORDER: Order price ₹${testOrderPrice.toLocaleString()} is within the dynamic ceiling of ₹${maxCollarPrice.toLocaleString()}. Forwarded to FIFO in-memory matching engine in 0.8ms.`,
      })
    }
  }

  // --- 2. Dutch Auction Simulator State ---
  const initialAuctionPrice = 2500
  const reserveFloorPrice = 1800
  const auctionDurationSec = 60 // 1 minute demo decay
  const [auctionSecondsRemaining, setAuctionSecondsRemaining] = useState(auctionDurationSec)
  const [auctionRunning, setAuctionRunning] = useState(false)
  const [auctionPurchased, setAuctionPurchased] = useState(null)

  // Current linear decaying price
  const decayFraction = 1 - (auctionSecondsRemaining / auctionDurationSec)
  const currentAuctionPrice = Math.round(initialAuctionPrice - (initialAuctionPrice - reserveFloorPrice) * decayFraction)

  useEffect(() => {
    let timer = null
    if (auctionRunning && auctionSecondsRemaining > 0 && !auctionPurchased) {
      timer = setInterval(() => {
        setAuctionSecondsRemaining((prev) => {
          if (prev <= 1) {
            setAuctionRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [auctionRunning, auctionSecondsRemaining, auctionPurchased])

  const handleBuyDutch = () => {
    setAuctionRunning(false)
    setAuctionPurchased({
      price: currentAuctionPrice,
      savings: initialAuctionPrice - currentAuctionPrice,
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  const handleResetDutch = () => {
    setAuctionRunning(false)
    setAuctionSecondsRemaining(auctionDurationSec)
    setAuctionPurchased(null)
  }

  // --- 3. FIFO Engine Queue State ---
  const [fifoLog, setFifoLog] = useState([
    { id: 'ORD-902', time: '18:32:01.104', type: 'LIMIT_BUY', price: 2200, qty: 1, user: 'Fan_8829', status: 'MATCHED', latency: '0.62ms' },
    { id: 'ORD-901', time: '18:32:01.098', type: 'LIMIT_SELL', price: 2350, qty: 2, user: 'Rahul V.', status: 'RESTING', latency: '0.41ms' },
    { id: 'ORD-900', time: '18:31:59.882', type: 'MARKET_BUY', price: 2300, qty: 1, user: 'Ananya I.', status: 'SETTLED', latency: '0.88ms' },
  ])
  const [incomingType, setIncomingType] = useState('MARKET_BUY')

  const handlePushOrder = () => {
    const now = new Date()
    const ms = String(now.getMilliseconds()).padStart(3, '0')
    const timeStr = `${now.toTimeString().split(' ')[0]}.${ms}`
    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`
    const latency = (0.2 + Math.random() * 0.7).toFixed(2) + 'ms'

    const newOrder = {
      id: orderId,
      time: timeStr,
      type: incomingType,
      price: incomingType === 'MARKET_BUY' ? 2300 : 2250,
      qty: 1,
      user: 'You (Trader)',
      status: incomingType === 'MARKET_BUY' ? 'MATCHED' : 'RESTING',
      latency,
    }

    setFifoLog((prev) => [newOrder, ...prev.slice(0, 6)])
  }

  return (
    <section id="simulator" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Ambient Lighting Cones */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 mb-4 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold tracking-wide">INTERACTIVE SANDBOX · LIVE PROTOCOL PLAYGROUND</span>
        </div>
        <h2 className="font-sans font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Protocol Mechanics Playground
        </h2>
        <p className="text-base sm:text-lg text-white/75 font-light">
          Experience the three core cryptographic and algorithmic guarantees of the secondary exchange.
        </p>
      </div>

      {/* Main Interactive Container (Spatial Glass) */}
      <div className="spatial-glass rounded-3xl border border-white/20 shadow-xl shadow-black/40 overflow-hidden relative z-10 transition-all duration-300">
        
        {/* Navigation Tabs (Sunken Spatial Tray) */}
        <div className="flex border-b border-white/20 bg-[#1B1F29] p-1.5 gap-2">
          <button
            onClick={() => setActiveTab('collar')}
            className={`flex-1 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-mono tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'collar'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 font-semibold shadow-[0_0_20px_rgba(239,68,68,0.25)]'
                : 'text-white/75 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Anti-Scalper Price Collar</span>
          </button>

          <button
            onClick={() => setActiveTab('dutch')}
            className={`flex-1 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-mono tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'dutch'
                ? 'bg-[#D4AF37]/20 text-[#F5D061] border border-[#D4AF37]/50 font-semibold shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                : 'text-white/75 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Timer className="w-4 h-4 text-[#F5D061]" />
            <span>Dutch Auction Liquidator</span>
          </button>

          <button
            onClick={() => setActiveTab('fifo')}
            className={`flex-1 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-mono tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'fifo'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-semibold shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                : 'text-white/75 hover:text-white hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>In-Memory FIFO Matcher</span>
          </button>
        </div>

        {/* Tab 1: Anti-Scalper Price Collar Sandbox */}
        {activeTab === 'collar' && (
          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Controls Column */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <h3 className="font-sans font-bold text-2xl text-white mb-2">
                    Dynamic Price Collar Sandbox
                  </h3>
                  <p className="text-sm text-white/75 font-light">
                    Adjust the original Face Value and maximum allowable collar margin. Test any resell price to see whether the Go engine accepts or drops the order before reaching the book.
                  </p>
                </div>

                {/* Slider: Original Face Value */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#181B24] border border-white/20 shadow-inner">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/75">1. ORIGINAL FACE VALUE</span>
                    <span className="text-[#F5D061] font-bold text-sm">₹{faceValue.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="10000"
                    step="500"
                    value={faceValue}
                    onChange={(e) => setFaceValue(Number(e.target.value))}
                    className="w-full accent-[#D4AF37] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-white/75">
                    <span>₹500</span>
                    <span>₹10,000</span>
                  </div>
                </div>

                {/* Slider: Maximum Collar Cap % */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#181B24] border border-white/20 shadow-inner">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/75">2. MAX COLLAR CEILING BAND</span>
                    <span className="text-rose-400 font-bold text-sm">+{collarPercent}% (Cap: ₹{maxCollarPrice.toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={collarPercent}
                    onChange={(e) => setCollarPercent(Number(e.target.value))}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-white/75">
                    <span>+10% (Strict)</span>
                    <span>+50% (Relaxed)</span>
                  </div>
                </div>

                {/* Input: Test Order Price */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/75">3. TEST SECONDARY ASK / BID PRICE</span>
                    <span className="text-white font-bold">₹{testOrderPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <input
                      type="number"
                      value={testOrderPrice}
                      onChange={(e) => setTestOrderPrice(Number(e.target.value))}
                      className="flex-1 bg-[#171A23] border border-white/20 rounded-xl px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-[#D4AF37]/70 shadow-inner"
                    />
                    <button
                      onClick={() => setTestOrderPrice(Math.round(faceValue * 1.15))}
                      className="px-3.5 py-2 text-xs font-mono rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer"
                    >
                      Fair Fan (₹{Math.round(faceValue * 1.15).toLocaleString()})
                    </button>
                    <button
                      onClick={() => setTestOrderPrice(faceValue * 3)}
                      className="px-3.5 py-2 text-xs font-mono rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 transition-all cursor-pointer"
                    >
                      Bot 3x (₹{(faceValue * 3).toLocaleString()})
                    </button>
                  </div>
                </div>

                {/* Submit Test Button */}
                <button
                  onClick={handleTestCollar}
                  className="w-full py-4 rounded-xl font-mono text-xs uppercase tracking-widest font-bold text-[#111318] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_30px_rgba(212,175,55,0.45)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#111318]" />
                  <span>Execute Pre-Matching Collar Check</span>
                </button>
              </div>

              {/* Visual Meter & Engine Console */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Visual Band Gauge */}
                <div className="bg-[#171A23] border border-white/20 rounded-3xl p-6 shadow-inner">
                  <span className="text-xs font-mono text-white/75 block mb-3 font-semibold">
                    DYNAMIC PRICE BAND VISUALIZER
                  </span>
                  
                  <div className="relative h-12 w-full bg-[#1B1F29] rounded-2xl overflow-hidden flex border border-white/20 shadow-inner">
                    {/* Fair Band */}
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500/40 to-emerald-500/70 flex items-center justify-center text-[10px] font-mono text-emerald-100 font-semibold px-2"
                      style={{ width: '60%' }}
                    >
                      SAFE COLLAR ZONE (Up to ₹{maxCollarPrice.toLocaleString()})
                    </div>
                    {/* Scalper Penalty Zone */}
                    <div
                      className="h-full bg-gradient-to-r from-rose-500/40 to-rose-500/80 flex items-center justify-center text-[10px] font-mono text-rose-100 font-semibold px-2"
                      style={{ width: '40%' }}
                    >
                      REJECTION GOUGE ZONE
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-mono mt-3">
                    <span className="text-white/75">Face: ₹{faceValue}</span>
                    <span className="text-[#F5D061] font-semibold">Ceiling Cap: ₹{maxCollarPrice.toLocaleString()}</span>
                    <span className="text-rose-400">Uncapped Gouge</span>
                  </div>
                </div>

                {/* Console Log Output */}
                <div className="bg-[#1B1F29] border border-white/20 rounded-3xl p-6 font-mono text-xs shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-white/20 mb-3">
                    <span className="flex items-center gap-2 text-white/75">
                      <Terminal className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Go In-Memory Gate Output
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">STATUS: ACTIVE</span>
                  </div>

                  {collarResult ? (
                    <div className={`p-4 rounded-2xl border transition-all animate-spatial-pop ${
                      collarResult.status === 'REJECTED'
                        ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                    }`}>
                      <div className="flex items-center gap-2 font-bold mb-2">
                        {collarResult.status === 'REJECTED' ? (
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        <span>HTTP {collarResult.code} · {collarResult.status}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-white/80">
                        {collarResult.message}
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-white/75">
                      Click "Execute Pre-Matching Collar Check" to simulate Go engine gate response.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Automated Dutch Auction Liquidator */}
        {activeTab === 'dutch' && (
          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-xs font-mono text-[#F5D061] shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                  <span>AUTOMATED LIQUIDATION · DUTCH AUCTION</span>
                </div>
                <h3 className="font-sans font-bold text-2xl text-white">
                  Dutch Price-Decay Auction
                </h3>
                <p className="text-sm text-white/75 font-light leading-relaxed">
                  Distressed festival passes liquidate over time without panic dumping. Price starts at collar ceiling (₹2,500) and continuously decays toward the reserve floor (₹1,800). The first bidder to click instantly locks the trade!
                </p>

                {/* Progress bar */}
                <div className="space-y-2 p-4 rounded-2xl bg-[#181B24] border border-white/20 shadow-inner">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white/75">AUCTION TIMER</span>
                    <span className="text-[#F5D061] font-bold">{auctionSecondsRemaining}s remaining</span>
                  </div>
                  <div className="w-full bg-[#1B1F29] h-3.5 rounded-full overflow-hidden border border-white/20">
                    <div
                      className="bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-rose-500 h-full transition-all duration-1000 shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                      style={{ width: `${(auctionSecondsRemaining / auctionDurationSec) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {!auctionRunning ? (
                    <button
                      onClick={() => setAuctionRunning(true)}
                      disabled={auctionSecondsRemaining === 0 || auctionPurchased}
                      className="px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-wider font-bold bg-[#D4AF37] text-black hover:bg-[#F5D061] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Auction Decay</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setAuctionRunning(false)}
                      className="px-6 py-3 rounded-xl font-mono text-xs uppercase tracking-wider font-bold bg-white/[0.08] text-white border border-white/[0.2] hover:bg-white/[0.12] flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause Decay</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetDutch}
                    className="px-4 py-3 rounded-xl font-mono text-xs uppercase tracking-wider text-white/75 bg-[#181B24] border border-white/20 hover:text-white hover:border-white/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Right: Live Ticker & Purchase Card */}
              <div className="lg:col-span-6">
                <div className="bg-[#171A23] border border-white/20 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xl shadow-black/40">
                  
                  <span className="text-xs font-mono tracking-widest text-white/75 uppercase block mb-1">
                    CURRENT DECAYING CLEARING PRICE
                  </span>
                  
                  <div className="text-4xl sm:text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5D061] to-[#D4AF37] my-4 drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                    ₹{currentAuctionPrice.toLocaleString()}
                  </div>

                  <div className="flex justify-center gap-6 text-xs font-mono text-white/75 mb-8">
                    <div>
                      <span className="block text-[10px]">CEILING</span>
                      <span className="text-rose-400 font-semibold">₹{initialAuctionPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-white/75 self-center">➔</div>
                    <div>
                      <span className="block text-[10px]">RESERVE FLOOR</span>
                      <span className="text-emerald-400 font-semibold">₹{reserveFloorPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {auctionPurchased ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-left font-mono text-xs text-emerald-300 shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-spatial-pop">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>AUCTION WON & ATOMIC ESCROW LOCKED</span>
                      </div>
                      <p className="text-white/80">
                        Purchased 1x VIP Festival Pass for <strong className="text-white">₹{auctionPurchased.price.toLocaleString()}</strong>. 
                        You saved ₹{auctionPurchased.savings.toLocaleString()} off the initial ceiling!
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleBuyDutch}
                      disabled={auctionSecondsRemaining === 0}
                      className="w-full py-4 rounded-2xl font-mono text-sm uppercase tracking-widest font-bold text-black bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 hover:shadow-[0_0_35px_rgba(34,197,94,0.45)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Buy Now at ₹{currentAuctionPrice.toLocaleString()}</span>
                    </button>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: In-Memory FIFO Queue Visualizer */}
        {activeTab === 'fifo' && (
          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className="lg:col-span-5 space-y-4">
                <h3 className="font-sans font-bold text-2xl text-white">
                  Deterministic In-Memory FIFO Engine
                </h3>
                <p className="text-sm text-white/75 font-light leading-relaxed">
                  Orders in Darkhold are matched strictly using Price-Time Priority. Sub-millisecond timestamps ensure no bot or validator can reorder transactions (zero MEV).
                </p>

                <div className="pt-2 space-y-3">
                  <div className="flex gap-2 p-1.5 rounded-2xl bg-[#181B24] border border-white/20">
                    <button
                      onClick={() => setIncomingType('MARKET_BUY')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                        incomingType === 'MARKET_BUY'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                          : 'bg-transparent border-transparent text-white/75 hover:text-white'
                      }`}
                    >
                      Market Buy (Fill Top Ask)
                    </button>
                    <button
                      onClick={() => setIncomingType('LIMIT_BID')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                        incomingType === 'LIMIT_BID'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                          : 'bg-transparent border-transparent text-white/75 hover:text-white'
                      }`}
                    >
                      Limit Bid (Rest in Queue)
                    </button>
                  </div>

                  <button
                    onClick={handlePushOrder}
                    className="w-full py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-black hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-black" />
                    <span>Dispatch Order to Go Ring Buffer</span>
                  </button>
                </div>
              </div>

              {/* Right: Live Queue stream */}
              <div className="lg:col-span-7 bg-[#171A23] border border-white/20 rounded-3xl p-6 font-mono text-xs shadow-inner">
                <div className="flex items-center justify-between pb-3.5 border-b border-white/20 mb-3.5 text-white/75">
                  <span>GO WORKER POOL · FIFO MATCH DISPATCH</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px]">LOCK-FREE CONCURRENCY</span>
                </div>

                <div className="space-y-2">
                  {fifoLog.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-[#181B24] border border-white/20 flex items-center justify-between gap-3 text-xs hover:border-white/20 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.type.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#D4AF37]/20 text-[#F5D061] border border-[#D4AF37]/30'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-white/75">{log.user}</span>
                        </div>
                        <div className="text-[11px] text-white/75 mt-1">
                          Price: ₹{log.price.toLocaleString()} · Qty: {log.qty} · Time: {log.time}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 block">
                          {log.status}
                        </span>
                        <span className="text-[10px] text-white/75 mt-1 block">
                          Latency: {log.latency}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </section>
  )
}
