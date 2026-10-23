import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Shield, Cpu, Activity, Menu, X, ArrowUpRight, Lock, 
  Sparkles, ExternalLink, User, LogOut, ChevronDown, Layers 
} from 'lucide-react'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef(null)
  const location = useLocation()

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isHome = location.pathname === '/'

  const navLinks = [
    { name: 'Overview', href: isHome ? '#overview' : '/#overview' },
    { name: 'Problem vs Defense', href: isHome ? '#problem-defense' : '/#problem-defense' },
    { name: 'Core Engine', href: isHome ? '#features' : '/#features' },
    { name: 'Live Simulator', href: isHome ? '#simulator' : '/#simulator' },
    { name: 'Architecture', href: isHome ? '#architecture' : '/#architecture' },
    { name: 'Rubric & Specs', href: isHome ? '#rubric' : '/#rubric' },
  ]

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#080706]/90 border-b border-[#D4AF37]/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo & Sigil */}
        <Link to="/" className="flex items-center gap-3 group">
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
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="px-3 py-2 rounded-lg text-xs font-mono font-medium text-[#C2BCB0] hover:text-[#FFF] hover:bg-[#1E1916]/60 transition-colors"
            >
              {link.name}
            </a>
          ))}
          {isAuthenticated && (
            <Link
              to="/dashboard"
              className="px-3 py-2 rounded-lg text-xs font-mono font-semibold text-[#F5D061] hover:text-[#FFF] hover:bg-[#1E1916]/60 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right CTA & Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Engine Status Tag */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14100E] border border-[#22C55E]/30 text-xs font-mono text-[#E5E0D8]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            <span className="text-[#A39E93]">ENGINE:</span>
            <span className="text-[#22C55E] font-medium">SUB-10MS</span>
          </div>

          {!isAuthenticated ? (
            /* Unauthenticated state: Sign In & Sign Up buttons */
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-[#C2BCB0] hover:text-white hover:bg-[#1E1916] transition-all border border-transparent hover:border-[#2D2520]"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="relative group overflow-hidden px-4 py-2 rounded-xl font-medium text-xs tracking-wider uppercase font-mono text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#E5C378] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center gap-1.5"
              >
                <span>Sign Up</span>
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          ) : (
            /* Authenticated state: Profile Dropdown */
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#181412] border border-[#D4AF37]/40 hover:border-[#D4AF37] transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.15)]"
              >
                <div className="w-7 h-7 rounded-lg bg-[#2A211B] border border-[#D4AF37]/50 flex items-center justify-center font-cinzel font-bold text-xs text-[#F5D061]">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="block text-xs font-mono font-bold text-white leading-tight">
                    {user?.username}
                  </span>
                  <span className="block text-[10px] font-mono text-[#22C55E] leading-tight">
                    Verified
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0D0B0A] border border-[#D4AF37]/30 shadow-[0_15px_40px_rgba(0,0,0,0.85)] p-2 z-50 space-y-1">
                  <div className="px-3 py-2 border-b border-[#241E19] mb-1">
                    <p className="text-xs font-mono font-bold text-white truncate">{user?.username}</p>
                    <p className="text-[11px] font-mono text-[#8E867A] truncate">{user?.email}</p>
                  </div>

                  <Link
                    to="/dashboard"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                  >
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <span>Trading Dashboard</span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#F5D061]" />
                    <span>Profile & Active Sessions</span>
                  </Link>

                  <div className="pt-1 border-t border-[#241E19]">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono text-[#EF4444] hover:bg-[#291010] transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
              className="block px-3 py-2 rounded-lg text-sm font-medium text-[#DCD6CA] hover:text-[#FFF] hover:bg-[#1E1916]"
            >
              {link.name}
            </a>
          ))}

          <div className="pt-3 border-t border-[#241E19] space-y-2">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold text-white bg-[#181412] border border-[#2D2520]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] to-[#F5D061]"
                >
                  Create Account (Sign Up)
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold text-[#F5D061] bg-[#181412] border border-[#D4AF37]/40"
                >
                  Open Dashboard
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold text-white bg-[#181412] border border-[#2D2520]"
                >
                  Profile & Sessions
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full text-center block px-4 py-2 rounded-xl font-mono text-xs text-[#EF4444] bg-[#291010] border border-[#EF4444]/30"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
