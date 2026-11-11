import React from 'react'
import { Shield, ArrowUp, ExternalLink, Terminal, Heart, GitBranch, Code2 } from 'lucide-react'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="relative bg-[#181B23]/95 backdrop-blur-xl border-t border-white/20 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/20">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1B1F29] border border-[#D4AF37]/45 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="6" />
                  <polygon points="50,16 80,72 20,72" fill="none" stroke="#D4AF37" strokeWidth="6" />
                  <polygon points="50,84 20,28 80,28" fill="none" stroke="#EF4444" strokeWidth="5" />
                  <circle cx="50" cy="50" r="14" fill="#EF4444" />
                </svg>
              </div>
              <span className="font-cinzel font-black tracking-widest text-lg text-white">
                THE DARKHOLD EXCHANGE
              </span>
            </div>

            <p className="text-xs sm:text-sm text-white/75 font-light max-w-sm leading-relaxed">
              High-Frequency Secondary Marketplace & Order Book engineered to neutralize scalper swarms with in-memory FIFO matching, dynamic price collars, and provable Dutch auction liquidations.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-mono text-white/75">
                Go Engine Status: <strong className="text-emerald-400 font-semibold">Operational (&lt; 1ms)</strong>
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#D4AF37]">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs font-mono text-white/75">
              <li><a href="#overview" className="hover:text-white transition-colors duration-200">Overview</a></li>
              <li><a href="#problem-defense" className="hover:text-white transition-colors duration-200">Problem vs Defense</a></li>
              <li><a href="#features" className="hover:text-white transition-colors duration-200">Core Engine</a></li>
              <li><a href="#simulator" className="hover:text-white transition-colors duration-200">Live Simulator</a></li>
              <li><a href="#architecture" className="hover:text-white transition-colors duration-200">Architecture</a></li>
              <li><a href="#rubric" className="hover:text-white transition-colors duration-200">Rubric & Specs</a></li>
            </ul>
          </div>

          {/* Technology Badges */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-[#D4AF37]">
              Technical Stack
            </h4>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-[#181B24] border border-white/20 text-white/80 shadow-sm">React 19 (Vite)</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181B24] border border-emerald-500/30 text-emerald-400 shadow-sm">Go 1.24 Matching Engine</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181B24] border border-white/20 text-[#3ECF8E] shadow-sm">Supabase DB Only</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181B24] border border-white/20 text-[#F5D061] shadow-sm">WebSockets (L2 Depth)</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181B24] border border-rose-500/30 text-rose-400 shadow-sm">Anti-Scalp Price Collar</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#181B24] border border-amber-500/30 text-[#E5C378] shadow-sm">Dutch Auction Engine</span>
            </div>
          </div>

          {/* Deliverable Tag & Back to Top */}
          <div className="md:col-span-2 space-y-3 text-left md:text-right flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-white/75 block">PLATFORM STATUS</span>
              <span className="text-xs font-mono font-bold text-[#F5D061]">ENTERPRISE EDITION</span>
            </div>

            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-2 self-start md:self-end px-3.5 py-2 rounded-xl bg-[#171A23] border border-white/20 hover:border-[#D4AF37]/50 text-xs font-mono text-[#D4AF37] hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Bottom Credits */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-white/75">
          <div>
            © 2026 The Darkhold Exchange. High-Frequency Secondary Marketplace & Order Book.
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/75">React Frontend + Go In-Memory Engine + Supabase DB</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
