import React from 'react'
import { ShieldCheck, Cpu, ArrowUpRight, Lock, Gauge, Zap, Terminal } from 'lucide-react'

export default function Hero() {
  return (
    <section id="overview" className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden arcane-grid-bg">
      {/* Subtle Ambient Architectural Spotlight */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1A1D26] via-[#14161C] to-[#14161C]" />
        <div className="absolute inset-0 arcane-radial-glow" />
      </div>

      {/* Rotating Background Geometric Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] md:w-[1000px] h-[700px] md:h-[1000px] pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-rotate-slow">
          <circle cx="50" cy="50" r="48" fill="none" stroke="#D4AF37" strokeWidth="0.35" strokeDasharray="3 4" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="#EF4444" strokeWidth="0.4" strokeDasharray="1 2" />
          <circle cx="50" cy="50" r="33" fill="none" stroke="#D4AF37" strokeWidth="0.25" strokeDasharray="1 3" />
          <polygon points="50,18 78,66 22,66" fill="none" stroke="#D4AF37" strokeWidth="0.35" />
          <polygon points="50,82 22,34 78,34" fill="none" stroke="#EF4444" strokeWidth="0.35" />
          <circle cx="50" cy="50" r="17" fill="none" stroke="#D4AF37" strokeWidth="0.4" strokeDasharray="4 2" />
          <circle cx="50" cy="50" r="8" fill="none" stroke="#EF4444" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Subtle Counter-Rotating Inner Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] md:w-[680px] h-[480px] md:h-[680px] pointer-events-none opacity-25">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-rotate-reverse-slow">
          <polygon points="50,12 85,50 50,88 15,50" fill="none" stroke="#D4AF37" strokeWidth="0.3" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="26" fill="none" stroke="#EF4444" strokeWidth="0.3" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto text-center z-10">
        {/* Top Live Status Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full gloss-pill text-xs font-mono tracking-wider text-[#E5C378] mb-8 shadow-[0_0_18px_rgba(212,175,55,0.12)]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-[#F5D061] font-bold">LIVE PRODUCTION</span>
          <span className="text-white/75">|</span>
          <span className="text-white font-medium">VERIFIED SECONDARY TICKET EXCHANGE</span>
        </div>

        {/* Cinematic Main Title */}
        <h1 className="font-cinzel font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-white via-[#F4EDE0] to-[#C5A059] leading-[1.08] mb-6 drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
          THE DARKHOLD <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-rose-500">
            EXCHANGE
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-white/70 font-light leading-relaxed mb-10">
          Buy and sell verified event tickets safely at fair, capped prices. 
          Powered by a <span className="text-[#F5D061] font-medium underline decoration-[#D4AF37]/50 underline-offset-4">real-time FIFO matching engine in Go</span>, 
          live order book pricing, <span className="text-rose-400 font-medium">anti-scalper price ceilings</span>, 
          and transparent <span className="text-[#E5C378] font-medium">Dutch auctions</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-16">
          <a
            href="#simulator"
            className="group relative px-7 py-3.5 rounded-2xl font-mono text-sm tracking-wider uppercase font-semibold text-black bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_45px_rgba(212,175,55,0.6)] transition-all flex items-center gap-3 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Try Interactive Demo</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>

          <a
            href="#architecture"
            className="px-6 py-3.5 rounded-2xl font-mono text-sm tracking-wider uppercase font-medium text-white/80 spatial-glass hover:bg-white/[0.08] hover:text-white hover:border-[#D4AF37]/50 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-[#D4AF37]" />
            <span>How It Works</span>
          </a>
        </div>

        {/* Real-time Performance Metrics Bar (Pass & Victory Tier guarantees) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          
          <div className="spatial-card p-5 rounded-2xl text-left transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_12px_28px_rgba(0,0,0,0.38),0_0_18px_rgba(34,197,94,0.15)]">
            <div className="flex items-center justify-between text-white/75 text-xs font-mono mb-1">
              <span>MATCHING LATENCY</span>
              <Gauge className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 drop-shadow-[0_0_12px_rgba(34,197,94,0.3)]">
              &lt; 1ms
            </div>
            <div className="text-[11px] text-white/75 mt-1 font-mono">
              High-Speed In-Memory Matching (&lt; 1ms)
            </div>
          </div>

          <div className="spatial-card p-5 rounded-2xl text-left transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-[0_12px_28px_rgba(0,0,0,0.38),0_0_18px_rgba(212,175,55,0.15)]">
            <div className="flex items-center justify-between text-white/75 text-xs font-mono mb-1">
              <span>CONCURRENCY</span>
              <Cpu className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F5D061] drop-shadow-[0_0_12px_rgba(212,175,55,0.3)]">
              1,250+
            </div>
            <div className="text-[11px] text-white/75 mt-1 font-mono">
              Orders/sec lock-free ring buffer
            </div>
          </div>

          <div className="spatial-card p-5 rounded-2xl text-left transition-all duration-300 hover:border-rose-500/50 hover:shadow-[0_12px_28px_rgba(0,0,0,0.38),0_0_18px_rgba(239,68,68,0.15)]">
            <div className="flex items-center justify-between text-white/75 text-xs font-mono mb-1">
              <span>PRICE COLLAR CAP</span>
              <ShieldCheck className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)]">
              +25% Cap
            </div>
            <div className="text-[11px] text-white/75 mt-1 font-mono">
              Hard anti-scalper ceiling pinned to face
            </div>
          </div>

          <div className="spatial-card p-5 rounded-2xl text-left transition-all duration-300 hover:border-[#D4AF37]/50 hover:shadow-[0_12px_28px_rgba(0,0,0,0.38),0_0_18px_rgba(212,175,55,0.15)]">
            <div className="flex items-center justify-between text-white/75 text-xs font-mono mb-1">
              <span>LEDGER ANOMALIES</span>
              <Lock className="w-4 h-4 text-[#F5D061]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
              0.00%
            </div>
            <div className="text-[11px] text-white/75 mt-1 font-mono">
              Atomic double-entry reconciliation
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
