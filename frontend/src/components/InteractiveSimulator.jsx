import React, { useState, useEffect } from 'react'
import { ShieldCheck, ShieldAlert, Cpu, Timer, Play, Pause, RotateCcw, Zap, CheckCircle2, ChevronRight, Terminal, DollarSign, ArrowRight } from 'lucide-react'

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
      timeRemaining: auctionSecondsRemaining,
      savings: initialAuctionPrice - currentAuctionPrice,
    })
  }

  const handleResetDutch = () => {
    setAuctionRunning(false)
    setAuctionSecondsRemaining(auctionDurationSec)
    setAuctionPurchased(null)
  }

  // --- 3. FIFO Matcher State ---
  const [fifoLog, setFifoLog] = useState([
    { id: 'TX-101', type: 'BID', user: 'Corvin Ash', price: 2250, qty: 1, status: 'MATCHED', latency: '2.8ms', time: '18:24:09.112' },
    { id: 'TX-100', type: 'ASK', user: 'Vesper Thorn', price: 2250, qty: 1, status: 'RESTING -> FILLED', latency: '0.9ms', time: '18:21:08.841' },
    { id: 'TX-099', type: 'BID', user: 'Morgana Vale', price: 2200, qty: 1, status: 'RESTING (In Queue)', latency: '1.1ms', time: '18:18:04.209' },
  ])
  const [incomingType, setIncomingType] = useState('MARKET_BUY')

  const handlePushOrder = () => {
    const now = new Date()
    const ms = String(now.getMilliseconds()).padStart(3, '0')
    const timeStr = `${now.toLocaleTimeString('en-GB')}.${ms}`
    const txId = `TX-${Math.floor(100 + Math.random() * 900)}`

    if (incomingType === 'MARKET_BUY') {
      const newEntry = {
        id: txId,
        type: 'MARKET_BUY',
        user: 'Active User',
        price: 2300,
        qty: 1,
        status: 'MATCHED IMMEDIATELY',
        latency: `${(2.1 + Math.random() * 2).toFixed(1)}ms`,
        time: timeStr,
      }
      setFifoLog(prev => [newEntry, ...prev.slice(0, 5)])
    } else {
      const newEntry = {
        id: txId,
        type: 'LIMIT_BID',
        user: 'Active User',
        price: 2220,
        qty: 1,
        status: 'RESTING IN QUEUE',
        latency: `${(0.8 + Math.random() * 1).toFixed(1)}ms`,
        time: timeStr,
      }
      setFifoLog(prev => [newEntry, ...prev.slice(0, 5)])
    }
  }

  return (
    <section id="simulator" className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181412] border border-[#22C55E]/30 text-xs font-mono text-[#22C55E] mb-4">
          <Zap className="w-3.5 h-3.5 text-[#22C55E]" />
          <span>INTERACTIVE SANDBOX // TEST THE PROTOCOL LIVE</span>
        </div>
        <h2 className="font-cinzel font-black text-3xl sm:text-5xl text-white tracking-wide mb-4">
          Protocol Mechanics Playground
        </h2>
        <p className="text-base sm:text-lg text-[#B8B2A6]">
          Experience the three core cryptographic and algorithmic guarantees specified in Problem Statement 07.
        </p>
      </div>

      {/* Main Interactive Container */}
      <div className="gloss-panel rounded-2xl border-[#D4AF37]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2A231F] bg-[#120F0D]">
          <button
            onClick={() => setActiveTab('collar')}
            className={`flex-1 py-4 px-4 text-xs sm:text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'collar'
                ? 'bg-[#1C1714] text-[#F5D061] border-b-2 border-[#D4AF37] font-semibold'
                : 'text-[#8E867A] hover:text-[#FFF] hover:bg-[#161210]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#EF4444]" />
            <span>Anti-Scalper Price Collar</span>
          </button>

          <button
            onClick={() => setActiveTab('dutch')}
            className={`flex-1 py-4 px-4 text-xs sm:text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'dutch'
                ? 'bg-[#1C1714] text-[#F5D061] border-b-2 border-[#D4AF37] font-semibold'
                : 'text-[#8E867A] hover:text-[#FFF] hover:bg-[#161210]'
            }`}
          >
            <Timer className="w-4 h-4 text-[#D4AF37]" />
            <span>Dutch Auction Liquidator</span>
          </button>

          <button
            onClick={() => setActiveTab('fifo')}
            className={`flex-1 py-4 px-4 text-xs sm:text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'fifo'
                ? 'bg-[#1C1714] text-[#F5D061] border-b-2 border-[#D4AF37] font-semibold'
                : 'text-[#8E867A] hover:text-[#FFF] hover:bg-[#161210]'
            }`}
          >
            <Cpu className="w-4 h-4 text-[#22C55E]" />
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
                  <h3 className="font-cinzel font-bold text-2xl text-white mb-2">
                    Dynamic Price Collar Sandbox
                  </h3>
                  <p className="text-sm text-[#B8B2A6] font-light">
                    Adjust the original Face Value and maximum allowable collar margin. Test any resell price to see whether the Go engine accepts or drops the order before reaching the book.
                  </p>
                </div>

                {/* Slider: Original Face Value */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#8E867A]">1. ORIGINAL FACE VALUE</span>
                    <span className="text-[#F5D061] font-bold">₹{faceValue.toLocaleString()}</span>
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
                  <div className="flex justify-between text-[10px] font-mono text-[#6B6358]">
                    <span>₹500</span>
                    <span>₹10,000</span>
                  </div>
                </div>

                {/* Slider: Maximum Collar Cap % */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#8E867A]">2. MAX COLLAR CEILING BAND</span>
                    <span className="text-[#EF4444] font-bold">+{collarPercent}% (Cap: ₹{maxCollarPrice.toLocaleString()})</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={collarPercent}
                    onChange={(e) => setCollarPercent(Number(e.target.value))}
                    className="w-full accent-[#EF4444] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#6B6358]">
                    <span>+10% (Strict)</span>
                    <span>+50% (Relaxed)</span>
                  </div>
                </div>

                {/* Input: Test Order Price */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#8E867A]">3. TEST SECONDARY ASK / BID PRICE</span>
                    <span className="text-white font-bold">₹{testOrderPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={testOrderPrice}
                      onChange={(e) => setTestOrderPrice(Number(e.target.value))}
                      className="flex-1 bg-[#120F0D] border border-[#2D2520] rounded-xl px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      onClick={() => setTestOrderPrice(Math.round(faceValue * 1.15))}
                      className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#86EFAC] hover:bg-[#22C55E]/25"
                    >
                      Fair Fan (₹{Math.round(faceValue * 1.15).toLocaleString()})
                    </button>
                    <button
                      onClick={() => setTestOrderPrice(faceValue * 3)}
                      className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#FCA5A5] hover:bg-[#EF4444]/25"
                    >
                      Bot 3x (₹{(faceValue * 3).toLocaleString()})
                    </button>
                  </div>
                </div>

                {/* Submit Test Button */}
                <button
                  onClick={handleTestCollar}
                  className="w-full py-3.5 rounded-xl font-mono text-xs uppercase tracking-widest font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#0B0908]" />
                  <span>Execute Pre-Matching Collar Check</span>
                </button>
              </div>

              {/* Visual Meter & Engine Console */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Visual Band Gauge */}
                <div className="bg-[#120F0D] border border-[#28211C] rounded-2xl p-5">
                  <span className="text-xs font-mono text-[#8E867A] block mb-3">
                    DYNAMIC PRICE BAND VISUALIZER
                  </span>
                  
                  <div className="relative h-10 w-full bg-[#1F1915] rounded-xl overflow-hidden flex border border-[#332822]">
                    {/* Fair Band */}
                    <div
                      className="h-full bg-gradient-to-r from-[#22C55E]/40 to-[#22C55E]/70 flex items-center justify-center text-[10px] font-mono text-emerald-100 font-semibold"
                      style={{ width: '60%' }}
                    >
                      SAFE COLLAR ZONE (Up to ₹{maxCollarPrice.toLocaleString()})
                    </div>
                    {/* Scalper Penalty Zone */}
                    <div
                      className="h-full bg-gradient-to-r from-[#EF4444]/40 to-[#EF4444]/80 flex items-center justify-center text-[10px] font-mono text-red-100 font-semibold"
                      style={{ width: '40%' }}
                    >
                      REJECTION GOUGE ZONE
                    </div>
                  </div>

                  <div className="flex justify-between text-xs font-mono mt-3">
                    <span className="text-[#8E867A]">Face: ₹{faceValue}</span>
                    <span className="text-[#F5D061] font-semibold">Ceiling Cap: ₹{maxCollarPrice.toLocaleString()}</span>
                    <span className="text-[#EF4444]">Uncapped Gouge</span>
                  </div>
                </div>

                {/* Console Log Output */}
                <div className="bg-[#090706] border border-[#241E19] rounded-2xl p-5 font-mono text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#1E1916] mb-3">
                    <span className="flex items-center gap-2 text-[#8E867A]">
                      <Terminal className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Go In-Memory Gate Output
                    </span>
                    <span className="text-[10px] text-[#22C55E]">STATUS: ACTIVE</span>
                  </div>

                  {collarResult ? (
                    <div className={`p-4 rounded-xl border ${
                      collarResult.status === 'REJECTED'
                        ? 'bg-[#2B1010]/80 border-[#EF4444]/50 text-red-300'
                        : 'bg-[#0E2614]/80 border-[#22C55E]/50 text-green-300'
                    }`}>
                      <div className="flex items-center gap-2 font-bold mb-2">
                        {collarResult.status === 'REJECTED' ? (
                          <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        )}
                        <span>HTTP {collarResult.code} // {collarResult.status}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#DCD6CA]">
                        {collarResult.message}
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-[#6B6358]">
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
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061]">
                  <span>AUTOMATED LIQUIDATION // VICTORY TIER</span>
                </div>
                <h3 className="font-cinzel font-bold text-2xl text-white">
                  Dutch Price-Decay Auction
                </h3>
                <p className="text-sm text-[#B8B2A6] font-light leading-relaxed">
                  Distressed festival passes liquidate over time without panic dumping. Price starts at collar ceiling (₹2,500) and continuously decays toward the reserve floor (₹1,800). The first bidder to click instantly locks the trade!
                </p>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#8E867A]">AUCTION TIMER</span>
                    <span className="text-[#F5D061] font-bold">{auctionSecondsRemaining}s remaining</span>
                  </div>
                  <div className="w-full bg-[#181412] h-3 rounded-full overflow-hidden border border-[#2A231F]">
                    <div
                      className="bg-gradient-to-r from-[#D4AF37] to-[#EF4444] h-full transition-all duration-1000"
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
                      className="px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold bg-[#D4AF37] text-[#0B0908] hover:bg-[#F5D061] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Auction Decay</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setAuctionRunning(false)}
                      className="px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold bg-[#2A221C] text-white border border-[#D4AF37]/30 flex items-center gap-2 cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause Decay</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetDutch}
                    className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-[#A39E93] bg-[#14100E] border border-[#26201C] hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Right: Live Ticker & Purchase Card */}
              <div className="lg:col-span-6">
                <div className="bg-[#120F0D] border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden">
                  
                  <span className="text-xs font-mono tracking-widest text-[#8E867A] uppercase block mb-1">
                    CURRENT DECAYING CLEARING PRICE
                  </span>
                  
                  <div className="text-4xl sm:text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF] via-[#F5D061] to-[#D4AF37] my-4">
                    ₹{currentAuctionPrice.toLocaleString()}
                  </div>

                  <div className="flex justify-center gap-6 text-xs font-mono text-[#8E867A] mb-8">
                    <div>
                      <span className="block text-[10px]">CEILING</span>
                      <span className="text-[#EF4444] font-semibold">₹{initialAuctionPrice.toLocaleString()}</span>
                    </div>
                    <div className="text-[#554D43] self-center">➔</div>
                    <div>
                      <span className="block text-[10px]">RESERVE FLOOR</span>
                      <span className="text-[#22C55E] font-semibold">₹{reserveFloorPrice.toLocaleString()}</span>
                    </div>
                  </div>

                  {auctionPurchased ? (
                    <div className="p-4 rounded-xl bg-[#0E2614] border border-[#22C55E]/40 text-left font-mono text-xs text-green-300">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                        <span>AUCTION WON & ATOMIC ESCROW LOCKED</span>
                      </div>
                      <p className="text-[#E0DBD2]">
                        Purchased 1x VIP Eclipse Pass for <strong className="text-white">₹{auctionPurchased.price.toLocaleString()}</strong>. 
                        You saved ₹{auctionPurchased.savings.toLocaleString()} off the initial ceiling!
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleBuyDutch}
                      disabled={auctionSecondsRemaining === 0}
                      className="w-full py-4 rounded-xl font-mono text-sm uppercase tracking-widest font-bold text-[#0B0908] bg-gradient-to-r from-[#22C55E] to-[#4ADE80] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Strike & Buy at ₹{currentAuctionPrice.toLocaleString()}</span>
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
                <h3 className="font-cinzel font-bold text-2xl text-white">
                  Deterministic In-Memory FIFO Engine
                </h3>
                <p className="text-sm text-[#B8B2A6] font-light leading-relaxed">
                  Orders in Darkhold are matched strictly using Price-Time Priority. Sub-millisecond timestamps ensure no bot or validator can reorder transactions (zero MEV).
                </p>

                <div className="pt-2 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIncomingType('MARKET_BUY')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                        incomingType === 'MARKET_BUY'
                          ? 'bg-[#22C55E]/20 border-[#22C55E] text-[#86EFAC]'
                          : 'bg-[#181412] border-[#2A231F] text-[#8E867A]'
                      }`}
                    >
                      Market Buy (Fill Top Ask)
                    </button>
                    <button
                      onClick={() => setIncomingType('LIMIT_BID')}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer ${
                        incomingType === 'LIMIT_BID'
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F5D061]'
                          : 'bg-[#181412] border-[#2A231F] text-[#8E867A]'
                      }`}
                    >
                      Limit Bid (Rest in Queue)
                    </button>
                  </div>

                  <button
                    onClick={handlePushOrder}
                    className="w-full py-3 rounded-xl font-mono text-xs uppercase tracking-wider font-bold bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-[#0B0908] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Cpu className="w-4 h-4 text-[#0B0908]" />
                    <span>Dispatch Order to Go Ring Buffer</span>
                  </button>
                </div>
              </div>

              {/* Right: Live Queue stream */}
              <div className="lg:col-span-7 bg-[#090706] border border-[#241E19] rounded-2xl p-5 font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E1916] mb-3 text-[#8E867A]">
                  <span>GO WORKER POOL // FIFO MATCH DISPATCH</span>
                  <span className="text-[#22C55E]">LOCK-FREE CONCURRENCY</span>
                </div>

                <div className="space-y-2">
                  {fifoLog.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-[#14100E] border border-[#241E19] flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{log.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            log.type.includes('BUY') ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#D4AF37]/15 text-[#F5D061]'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[#8E867A]">{log.user}</span>
                        </div>
                        <div className="text-[11px] text-[#A89E94] mt-1">
                          Price: ₹{log.price.toLocaleString()} · Qty: {log.qty} · Time: {log.time}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-black/40 text-[#22C55E] block">
                          {log.status}
                        </span>
                        <span className="text-[10px] text-[#8E867A] mt-1 block">
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
