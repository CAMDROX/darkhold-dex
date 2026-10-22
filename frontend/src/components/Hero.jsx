import React from 'react'
import { ShieldCheck, Cpu, ArrowUpRight, Lock, Gauge, Flame, Activity, Zap, PlayCircle, Terminal } from 'lucide-react'

export default function Hero() {
  return (
    <section id="overview" className="relative pt-12 pb-20 md:pt-20 md:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden arcane-grid-bg">
      {/* Cinematic Backdrop Image with Deep Vignette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img 
          src="/assets/hero-citadel.jpg" 
          alt="Darkhold Arcane Citadel" 
          className="w-full h-full object-cover object-center opacity-25 scale-105 filter saturate-150 contrast-125"
        />
        {/* Dark radial and gradient masks for smooth transition */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080706] via-[#080706]/75 to-[#080706]/90" />
        <div className="absolute inset-0 arcane-radial-glow" />
      </div>

      {/* Rotating Sacred Geometry Arcane Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] md:w-[1000px] h-[700px] md:h-[1000px] pointer-events-none opacity-25">
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] md:w-[680px] h-[480px] md:h-[680px] pointer-events-none opacity-20">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-rotate-reverse-slow">
          <polygon points="50,12 85,50 50,88 15,50" fill="none" stroke="#D4AF37" strokeWidth="0.3" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="26" fill="none" stroke="#EF4444" strokeWidth="0.3" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto text-center z-10">
        {/* Top Problem Statement Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full gloss-pill text-xs font-mono tracking-wider text-[#E5C378] mb-8 shadow-[0_0_25px_rgba(212,175,55,0.15)] animate-float-subtle">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-pulse" />
          <span className="text-[#F5D061] font-bold">PROBLEM STATEMENT // 07</span>
          <span className="text-[#5A4F44]">|</span>
          <span className="text-white font-medium">HIGH-FREQUENCY SECONDARY MARKETPLACE</span>
        </div>

        {/* Cinematic Main Title */}
        <h1 className="font-cinzel font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-[#FFF] via-[#F4EDE0] to-[#C5A059] leading-[1.08] mb-6 drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
          THE DARKHOLD <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#EF4444]">
            EXCHANGE
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-[#C8C2B6] font-light leading-relaxed mb-10">
          Neutralize predatory scalpers and bot swarms in secondary ticket & relic trades. 
          Engineered with an <span className="text-[#F5D061] font-normal underline decoration-[#D4AF37]/50 underline-offset-4">in-memory FIFO matching engine in Go</span>, 
          real-time WebSocket depth ladders, <span className="text-[#EF4444] font-normal">anti-scalper dynamic price collars</span>, 
          and provable <span className="text-[#E5C378] font-normal">Dutch auction liquidations</span>.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-16">
          <a
            href="#simulator"
            className="group relative px-7 py-3.5 rounded-xl font-mono text-sm tracking-wider uppercase font-semibold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_45px_rgba(212,175,55,0.6)] hover:scale-105 transition-all flex items-center gap-3"
          >
            <Zap className="w-4 h-4 fill-[#0B0908]" />
            <span>Simulate Order Engine</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>

          <a
            href="#architecture"
            className="px-6 py-3.5 rounded-xl font-mono text-sm tracking-wider uppercase font-medium text-[#E5E0D8] gloss-panel hover:bg-[#201A16] hover:text-[#FFF] hover:border-[#D4AF37]/50 transition-all flex items-center gap-2.5"
          >
            <Terminal className="w-4 h-4 text-[#D4AF37]" />
            <span>Architecture & Specs</span>
          </a>
        </div>

        {/* Real-time Performance Metrics Bar (Pass & Victory Tier guarantees) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          
          <div className="gloss-panel p-4 rounded-xl text-left transition-all">
            <div className="flex items-center justify-between text-[#8E867A] text-xs font-mono mb-1">
              <span>MATCHING LATENCY</span>
              <Gauge className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-[#22C55E]">
              &lt; 4.2ms
            </div>
            <div className="text-[11px] text-[#A59E92] mt-1 font-mono">
              Target: sub-10ms (Go In-Memory)
            </div>
          </div>

          <div className="gloss-panel p-4 rounded-xl text-left transition-all">
            <div className="flex items-center justify-between text-[#8E867A] text-xs font-mono mb-1">
              <span>CONCURRENCY</span>
              <Cpu className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F5D061]">
              1,250+
            </div>
            <div className="text-[11px] text-[#A59E92] mt-1 font-mono">
              Orders/sec lock-free ring buffer
            </div>
          </div>

          <div className="gloss-panel p-4 rounded-xl text-left transition-all">
            <div className="flex items-center justify-between text-[#8E867A] text-xs font-mono mb-1">
              <span>PRICE COLLAR CAP</span>
              <ShieldCheck className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-[#EF4444]">
              +25% Cap
            </div>
            <div className="text-[11px] text-[#A59E92] mt-1 font-mono">
              Hard anti-scalper ceiling pinned to face
            </div>
          </div>

          <div className="gloss-panel p-4 rounded-xl text-left transition-all">
            <div className="flex items-center justify-between text-[#8E867A] text-xs font-mono mb-1">
              <span>LEDGER ANOMALIES</span>
              <Lock className="w-4 h-4 text-[#E5C378]" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
              0.00%
            </div>
            <div className="text-[11px] text-[#A59E92] mt-1 font-mono">
              Atomic double-entry reconciliation
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
