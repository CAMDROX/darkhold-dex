import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  Menu, X, ArrowUpRight, User, LogOut, ChevronDown, Layers,
  ShieldCheck, ShieldAlert, Clock, Crown
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
    <header className="sticky top-0 z-50 w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2 transition-all duration-300">
      <div className="max-w-7xl mx-auto rounded-2xl navbar-warm-gold px-4 sm:px-6 h-16 flex items-center justify-between relative shadow-lg shadow-black/40">
        
        {/* Brand Logo & Sigil (Preserving Identity) */}
        <Link to="/" className="flex items-center gap-3 group transition-transform duration-300">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#382D1F] to-[#271F15] border border-[#D4AF37]/45 flex items-center justify-center p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:border-[#D4AF37] group-hover:shadow-[0_0_24px_rgba(212,175,55,0.45)] transition-all duration-300">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="6" strokeDasharray="6 3" />
              <polygon points="50,16 80,72 20,72" fill="none" stroke="#D4AF37" strokeWidth="6" />
              <polygon points="50,84 20,28 80,28" fill="none" stroke="#EF4444" strokeWidth="5" />
              <circle cx="50" cy="50" r="14" fill="#EF4444" className="animate-pulse" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-cinzel font-black tracking-widest text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5D061] to-[#D4AF37]">
                DARKHOLD
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-wider bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] rounded font-bold">
                DEX
              </span>
            </div>
            <p className="text-[9px] font-mono tracking-wider text-white/75 -mt-0.5">
              HIGH-FREQUENCY SECONDARY MARKET
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-white/75 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
            >
              {link.name}
            </a>
          ))}
          {isAuthenticated && (
            <Link
              to={user?.role === 'admin' ? '/admin/verifications' : '/dashboard'}
              className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold text-[#F5D061] bg-[#D4AF37]/15 border border-[#D4AF37]/40 hover:bg-[#D4AF37]/25 transition-all duration-200 shadow-sm"
            >
              {user?.role === 'admin' ? 'KYC Compliance' : 'Trading Dashboard'}
            </Link>
          )}
        </nav>

        {/* Right CTA & Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          
          {/* Engine Status Tag */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/20 text-xs font-mono text-white/70 shadow-sm">
            <span className="inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            <span className="text-white/75 text-[10px]">ENGINE:</span>
            <span className="text-[#22C55E] font-medium text-[11px]">INSTANT FIFO</span>
          </div>

          {!isAuthenticated ? (
            /* Unauthenticated state: Sign In & Sign Up buttons */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/20"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="relative group overflow-hidden px-4 py-2 rounded-xl font-medium text-xs tracking-wider uppercase font-mono text-black bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-300 flex items-center gap-1.5 shadow-md"
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
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border transition-all duration-300 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                  profileDropdownOpen ? 'border-[#D4AF37]/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-white/20 hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 flex items-center justify-center font-sans font-bold text-xs text-[#F5D061]">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-mono font-bold text-white leading-tight">
                      {user?.username}
                    </span>
                    {user?.role === 'admin' && (
                      <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] leading-none">
                        ADMIN
                      </span>
                    )}
                  </div>
                  {/* Three Statuses: verified, pending, unverified */}
                  {user?.kyc_status === 'verified' ? (
                    <span className="block text-[10px] font-mono text-[#22C55E] leading-tight flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>Verified</span>
                    </span>
                  ) : user?.kyc_status === 'pending' ? (
                    <span className="block text-[10px] font-mono text-[#F5D061] leading-tight flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Pending</span>
                    </span>
                  ) : (
                    <span className="block text-[10px] font-mono text-[#FB923C] leading-tight flex items-center gap-1">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      <span>Unverified</span>
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#D4AF37] transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180 text-[#F5D061]' : ''}`} />
              </button>

              {/* Profile Dropdown Menu (Spatial Popover) */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-76 rounded-2xl bg-[#222631]/98 backdrop-blur-2xl border border-white/20 spatial-popover p-2.5 z-50 space-y-1.5">
                  <div className="px-3.5 py-3 border border-white/20 bg-white/[0.06] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono font-bold text-white truncate">{user?.username}</p>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#F5D061]">
                        {user?.role === 'admin' ? 'Admin' : 'Trader'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-white/75 truncate mt-0.5">{user?.email}</p>
                  </div>

                  {/* Admin Portal Link */}
                  {user?.role === 'admin' && (
                    <Link
                      to="/admin/verifications"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#F5D061] bg-[#D4AF37]/10 border border-[#D4AF37]/35 hover:bg-[#D4AF37]/20 transition-all duration-200 font-semibold shadow-[0_2px_8px_rgba(212,175,55,0.15)]"
                    >
                      <Crown className="w-4 h-4 text-[#F5D061]" />
                      <span>Compliance KYC Review</span>
                    </Link>
                  )}

                  <Link
                    to="/dashboard"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/20 transition-all duration-200"
                  >
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <span>Trading Dashboard</span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/20 transition-all duration-200"
                  >
                    <User className="w-4 h-4 text-[#F5D061]" />
                    <span>Profile & Active Sessions</span>
                  </Link>

                  <div className="pt-1.5 border-t border-white/20">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#EF4444] bg-[#EF4444]/5 hover:bg-[#EF4444]/15 border border-transparent hover:border-[#EF4444]/30 transition-all duration-200 cursor-pointer text-left"
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
          className="lg:hidden p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] border border-white/20 text-[#D4AF37] cursor-pointer transition-all"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu (Spatial Drop) */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 rounded-2xl navbar-warm-gold p-4 space-y-3 animate-spatial-pop">
          <div className="flex items-center justify-between pb-3 border-b border-white/20">
            <div className="flex items-center gap-2 text-xs font-mono text-[#22C55E]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
              Go In-Memory FIFO Engine Active
            </div>
          </div>
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.07]"
            >
              {link.name}
            </a>
          ))}

          <div className="pt-3 border-t border-white/20 space-y-2">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold text-white bg-white/[0.07] border border-white/20"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-bold text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061]"
                >
                  Create Account (Sign Up)
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={user?.role === 'admin' ? '/admin/verifications' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold text-[#F5D061] bg-[#D4AF37]/15 border border-[#D4AF37]/40"
                >
                  {user?.role === 'admin' ? 'Open KYC Compliance Review' : 'Open Trading Dashboard'}
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center block px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider uppercase font-semibold text-white bg-white/[0.07] border border-white/20"
                >
                  Profile & Sessions
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full text-center block px-4 py-2 rounded-xl font-mono text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30"
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
