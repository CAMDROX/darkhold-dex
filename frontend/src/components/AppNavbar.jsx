import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Layers,
  User,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Clock,
  LogOut,
  ChevronDown,
  ExternalLink,
  Menu,
  X,
  Coins,
  Gavel,
} from 'lucide-react'

export default function AppNavbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const profileDropdownRef = useRef(null)

  const kycStatus = (user?.kyc_status || 'unverified').toLowerCase()
  const isAdmin = user?.role === 'admin'

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

  // Primary Navigation Tabs: focused solely on trading & compliance surfaces
  // (Profile & Security is intentionally kept in the user profile menu to avoid redundancy)
  const navTabs = isAdmin
    ? [
        {
          name: 'KYC Compliance Queue',
          to: '/admin/verifications',
          icon: Crown,
          active: location.pathname === '/admin/verifications',
          highlight: true,
        },
        {
          name: 'Trading Terminal',
          to: '/dashboard',
          icon: Layers,
          active: location.pathname === '/dashboard',
        },
        {
          name: 'Dutch Auctions',
          to: '/auctions',
          icon: Gavel,
          active: location.pathname === '/auctions',
        },
        {
          name: 'Asset Vault',
          to: '/assets',
          icon: Coins,
          active: location.pathname === '/assets',
        },
      ]
    : [
        {
          name: 'Trading Terminal',
          to: '/dashboard',
          icon: Layers,
          active: location.pathname === '/dashboard',
        },
        {
          name: 'Dutch Auctions',
          to: '/auctions',
          icon: Gavel,
          active: location.pathname === '/auctions',
        },
        {
          name: 'Asset Vault',
          to: '/assets',
          icon: Coins,
          active: location.pathname === '/assets',
        },
      ]

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2 transition-all duration-300">
      <div className="max-w-7xl mx-auto rounded-2xl navbar-warm-gold px-4 sm:px-6 h-16 flex items-center justify-between relative shadow-lg shadow-black/40">
        
        {/* Left: Brand Identity & Sigil (Clicking routes directly to appropriate home deck) */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to={isAdmin ? '/admin/verifications' : '/dashboard'}
            className="flex items-center gap-3 group transition-transform duration-300"
          >
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
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D061] rounded-md shadow-[0_0_10px_rgba(212,175,55,0.15)]">
                  {isAdmin ? 'ADMIN' : 'EXCHANGE'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/75">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                <span className="tracking-wide">{isAdmin ? 'COMPLIANCE SUITE' : 'SECONDARY MARKET'}</span>
              </div>
            </div>
          </Link>

          {/* Center Navigation Tabs: Clean, Crisp, Elevated */}
          <nav className="hidden lg:flex items-center gap-2 pl-6 border-l border-white/20">
            {navTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Link
                  key={tab.name}
                  to={tab.to}
                  className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 ${
                    tab.active
                      ? tab.highlight
                        ? 'bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/10 border border-[#D4AF37]/60 text-[#F5D061] font-bold shadow-[0_0_20px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]'
                        : 'bg-white/[0.08] border border-white/25 text-white font-bold shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]'
                      : 'text-white/75 hover:text-white hover:bg-white/[0.07] border border-transparent hover:border-white/20'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${tab.active ? 'text-[#F5D061]' : 'text-white/75 group-hover:text-white/80'}`} />
                  <span>{tab.name}</span>
                  {tab.active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: Engine Status Pill & Authenticated User Profile */}
        <div className="flex items-center gap-3">
          
          {/* Subtle Live Engine Collar Shield Indicator */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/20 text-xs font-mono text-white/70 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="hidden"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            <span className="text-white/75 text-[10px]">ENGINE:</span>
            <span className="text-[#22C55E] font-medium text-[11px]">FIFO COLLAR PROTECTED</span>
          </div>

          {/* User Profile Pill Trigger */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.13] border transition-all duration-300 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                profileDropdownOpen ? 'border-[#D4AF37]/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-white/20 hover:border-[#D4AF37]/40'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 flex items-center justify-center font-sans font-bold text-xs text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="block text-xs font-mono font-bold text-white leading-tight">
                    {user?.username}
                  </span>
                  {isAdmin && (
                    <span className="px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] leading-none">
                      ADMIN
                    </span>
                  )}
                </div>

                {/* KYC Status Badge */}
                {kycStatus === 'verified' ? (
                  <span className="block text-[10px] font-mono text-[#22C55E] leading-tight flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span className="opacity-90">Verified</span>
                  </span>
                ) : kycStatus === 'pending' ? (
                  <span className="block text-[10px] font-mono text-[#F5D061] leading-tight flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span className="opacity-90">Pending KYC</span>
                  </span>
                ) : (
                  <span className="block text-[10px] font-mono text-[#FB923C] leading-tight flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span className="opacity-90">Unverified</span>
                  </span>
                )}
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-[#D4AF37] transition-transform duration-300 ${profileDropdownOpen ? 'rotate-180 text-[#F5D061]' : ''}`} />
            </button>

            {/* Profile Dropdown: Purpose-Driven & Non-Redundant */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#222631]/98 backdrop-blur-2xl border border-white/20 spatial-popover p-2.5 z-50 space-y-1.5 shadow-xl shadow-black/40">
                
                {/* User Identity Card */}
                <div className="px-3.5 py-3 border border-white/20 bg-white/[0.06] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono font-bold text-white truncate">{user?.username}</p>
                    <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${
                      isAdmin 
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#F5D061]' 
                        : 'bg-white/[0.05] border-white/20 text-white/70'
                    }`}>
                      {isAdmin ? 'Compliance Admin' : 'Trader'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-white/75 truncate mt-0.5">{user?.email}</p>
                  
                  {/* Status Tag */}
                  <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-white/75 uppercase tracking-wider">KYC Status</span>
                    <span className={`font-bold uppercase px-2 py-0.5 rounded border text-[9px] ${
                      kycStatus === 'verified' 
                        ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30' 
                        : kycStatus === 'pending' 
                        ? 'text-[#F5D061] bg-[#F5D061]/10 border-[#F5D061]/30' 
                        : 'text-[#FB923C] bg-[#FB923C]/10 border-[#FB923C]/30'
                    }`}>
                      {kycStatus}
                    </span>
                  </div>
                </div>

                {/* Non-Redundant Profile Actions */}
                <div className="space-y-1 pt-1">
                  {/* Profile & Security Settings */}
                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/20 transition-all duration-200"
                  >
                    <User className="w-4 h-4 text-[#F5D061]" />
                    <span>Profile & Active Sessions</span>
                  </Link>

                  {/* Fast KYC Verification action for unverified traders */}
                  {!isAdmin && kycStatus !== 'verified' && (
                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#FB923C] bg-[#FB923C]/10 border border-[#FB923C]/30 hover:bg-[#FB923C]/20 transition-all duration-200 font-semibold"
                    >
                      <ShieldAlert className="w-4 h-4 text-[#FB923C]" />
                      <span>{kycStatus === 'pending' ? 'Check KYC Review Status' : 'Submit ID Verification'}</span>
                    </Link>
                  )}

                  {/* Admin Fast Access to KYC Queue */}
                  {isAdmin && (
                    <Link
                      to="/admin/verifications"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#F5D061] bg-[#D4AF37]/10 border border-[#D4AF37]/35 hover:bg-[#D4AF37]/20 transition-all duration-200 font-semibold"
                    >
                      <Crown className="w-4 h-4 text-[#F5D061]" />
                      <span>Review Pending KYC Queue</span>
                    </Link>
                  )}

                  {/* Link back to public overview */}
                  <Link
                    to="/"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/75 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/20 transition-all duration-200"
                  >
                    <ExternalLink className="w-4 h-4 text-white/75" />
                    <span>Public Landing Site</span>
                  </Link>
                </div>

                {/* Sign Out Action with Crimson Specular Tint */}
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

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] border border-white/20 text-[#D4AF37] cursor-pointer transition-all"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown (Compact & Clean) */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 rounded-2xl navbar-warm-gold p-3 space-y-1.5 animate-spatial-pop shadow-2xl">
          {navTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Link
                key={tab.name}
                to={tab.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all duration-200 ${
                  tab.active
                    ? 'bg-white/[0.08] text-[#F5D061] font-bold border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                    : 'text-white/70 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </Link>
            )
          })}
          
          <div className="pt-2 border-t border-white/20 space-y-1">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-mono text-white/70 hover:text-white hover:bg-white/[0.07]"
            >
              <User className="w-4 h-4 text-[#F5D061]" />
              <span>Profile & Sessions</span>
            </Link>

            <button
              onClick={() => {
                setMobileMenuOpen(false)
                logout()
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-mono text-[#EF4444] bg-[#EF4444]/5 hover:bg-[#EF4444]/15 text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
