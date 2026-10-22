import React, { useState } from 'react'
import { Shield, Cpu, Activity, Menu, X, ArrowUpRight, Lock, Sparkles, ExternalLink } from 'lucide-react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Overview', href: '#overview' },
    { name: 'Problem vs Defense', href: '#problem-defense' },
    { name: 'Core Engine', href: '#features' },
    { name: 'Live Simulator', href: '#simulator' },
    { name: 'Architecture', href: '#architecture' },
    { name: 'Rubric & Specs', href: '#rubric' },
  ]

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#080706]/85 border-b border-[#D4AF37]/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Sigil */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-[#1C1714] to-[#0E0C0B] border border-[#D4AF37]/40 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] group-hover:border-[#D4AF37] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="6" strokeDasharray="6 3" />
              <polygon points="50,16 80,72 20,72" fill="none" stroke="#D4AF37" strokeWidth="6" />
              <polygon points="50,84 20,28 80,28" fill="none" stroke="#EF4444" strokeWidth="5" />
              <circle cx="50" cy="50" r="14" fill="#EF4444" className="animate-pulse" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-black tracking-widest text-lg sm:text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFF] via-[#F5D061] to-[#D4AF37]">
                DARKHOLD
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-wider bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] rounded">
                DEX
              </span>
            </div>
            <p className="text-[10px] font-mono tracking-wider text-[#A39E93] -mt-0.5">
              SECONDARY ORDER BOOK // PS-07
            </p>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-[#C2BCB0] hover:text-[#FFF] hover:bg-[#1E1916]/60 transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right CTA & System Status Pill */}
        <div className="hidden md:flex items-center gap-4">
          {/* Engine Status Tag */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14100E] border border-[#22C55E]/30 text-xs font-mono text-[#E5E0D8] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            <span className="text-[#A39E93]">ENGINE:</span>
            <span className="text-[#22C55E] font-medium">SUB-10MS FIFO</span>
          </div>

          {/* Glowing CTA Button */}
          <a
            href="#simulator"
            className="relative group overflow-hidden px-5 py-2.5 rounded-xl font-medium text-xs tracking-wider uppercase font-mono text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all flex items-center gap-2"
          >
            <span>LAUNCH SIMULATOR</span>
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg bg-[#181412] border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#221C18]"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D0B0A]/95 border-b border-[#D4AF37]/30 px-4 pt-3 pb-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#2A231F]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
              Go In-Memory FIFO Engine Active
            </div>
          </div>
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-base font-medium text-[#DCD6CA] hover:text-[#FFF] hover:bg-[#1E1916]"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#simulator"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full text-center block mt-3 px-4 py-3 rounded-lg font-mono text-sm tracking-wider uppercase font-semibold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] to-[#F5D061]"
          >
            Launch Interactive Simulator
          </a>
        </div>
      )}
    </header>
  )
}
