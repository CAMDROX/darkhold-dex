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
  Activity,
  ArrowUpRight,
  ExternalLink,
  Laptop,
  CheckCircle,
  Menu,
  X,
  FileCheck,
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

  const navTabs = [
    {
      name: 'Trading Terminal',
      to: '/dashboard',
      icon: Layers,
      active: location.pathname === '/dashboard',
    },
    {
      name: 'Profile & Security',
      to: '/profile',
      icon: User,
      active: location.pathname === '/profile',
    },
  ]

  if (isAdmin) {
    navTabs.push({
      name: 'Compliance KYC Review',
      to: '/admin/verifications',
      icon: Crown,
      active: location.pathname === '/admin/verifications',
      highlight: true,
    })
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#090706]/95 border-b border-[#2A211B] shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Left: Brand Terminal Sigil */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#221B16] to-[#0D0B0A] border border-[#D4AF37]/50 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.25)] group-hover:border-[#D4AF37] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
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
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D061] rounded">
                  TERMINAL
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8E867A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span>DARK POOL ORDERBOOK // SEC-07</span>
              </div>
            </div>
          </Link>

          {/* Center Navigation Tabs (Terminal focused, NO landing page links) */}
          <nav className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-[#241E19]">
            {navTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Link
                  key={tab.name}
                  to={tab.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                    tab.active
                      ? tab.highlight
                        ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.2)] font-bold'
                        : 'bg-[#1C1613] border border-[#3E2F26] text-white font-bold shadow-[0_0_10px_rgba(0,0,0,0.5)]'
                      : 'text-[#A8A195] hover:text-white hover:bg-[#181310] border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.active ? 'text-[#F5D061]' : 'text-[#8E867A]'}`} />
                  <span>{tab.name}</span>
                </Link>
              )
            })}

            <Link
              to="/"
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-mono text-[#6E645A] hover:text-[#A8A195] hover:bg-[#14100E] transition-all"
              title="Return to Public Protocol Landing Page"
            >
              <span>Public Site</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>
          </nav>
        </div>

        {/* Right: Telemetry & Authenticated User Profile */}
        <div className="flex items-center gap-3">
          
          {/* Live Engine Telemetry Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#120E0C] border border-[#261E1A] text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
            </span>
            <span className="text-[#8E867A]">FIFO MATCHING:</span>
            <span className="text-[#22C55E] font-bold">3.4ms</span>
          </div>

          {/* User Profile Menu with 3-State KYC Badge */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#14100E] border border-[#D4AF37]/30 hover:border-[#D4AF37]/70 transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/50 flex items-center justify-center font-cinzel font-bold text-xs text-[#F5D061]">
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

                {/* Live Three-Status Badge */}
                {kycStatus === 'verified' ? (
                  <span className="block text-[10px] font-mono text-[#22C55E] leading-tight flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                ) : kycStatus === 'pending' ? (
                  <span className="block text-[10px] font-mono text-[#F5D061] leading-tight flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Pending Review</span>
                  </span>
                ) : (
                  <span className="block text-[10px] font-mono text-[#FB923C] leading-tight flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>Unverified</span>
                  </span>
                )}
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-[#D4AF37]" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0D0B0A] border border-[#D4AF37]/35 shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2.5 z-50 space-y-1">
                
                {/* User Header */}
                <div className="px-3 py-2.5 border-b border-[#241E19] mb-1.5 bg-[#14100E] rounded-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono font-bold text-white truncate">{user?.username}</p>
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      isAdmin 
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37]/40 text-[#F5D061] font-bold' 
                        : 'bg-[#1C1613] border-[#3A2D25] text-[#A8A195]'
                    }`}>
                      {isAdmin ? '👑 Compliance Admin' : 'Trader Tier'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[#8E867A] truncate mt-0.5">{user?.email}</p>
                  
                  {/* Status Tag */}
                  <div className="mt-2 pt-2 border-t border-[#241E19] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#8E867A]">KYC STATUS:</span>
                    <span className={`font-bold uppercase ${
                      kycStatus === 'verified' 
                        ? 'text-[#22C55E]' 
                        : kycStatus === 'pending' 
                        ? 'text-[#F5D061]' 
                        : 'text-[#FB923C]'
                    }`}>
                      {kycStatus}
                    </span>
                  </div>
                </div>

                {/* Admin Quick Action */}
                {isAdmin && (
                  <Link
                    to="/admin/verifications"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono text-[#F5D061] bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all font-semibold"
                  >
                    <Crown className="w-4 h-4 text-[#F5D061]" />
                    <span>Compliance KYC Review Queue</span>
                  </Link>
                )}

                <Link
                  to="/dashboard"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                >
                  <Layers className="w-4 h-4 text-[#D4AF37]" />
                  <span>Trading Terminal</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                >
                  <User className="w-4 h-4 text-[#F5D061]" />
                  <span>Profile & Security Sessions</span>
                </Link>

                <Link
                  to="/"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#8E867A] hover:text-white hover:bg-[#1E1916] transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-[#8E867A]" />
                  <span>Public Landing Site</span>
                </Link>

                <div className="pt-1.5 border-t border-[#241E19]">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#EF4444] hover:bg-[#291010] transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Current Device</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#14100E] border border-[#2D241E] text-[#D4AF37]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#241E19] bg-[#0A0807] px-4 py-4 space-y-2">
          {navTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Link
                key={tab.name}
                to={tab.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono ${
                  tab.active ? 'bg-[#1C1613] text-[#F5D061] font-bold' : 'text-[#A8A195]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </Link>
            )
          })}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono text-[#8E867A]"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Public Landing Site</span>
          </Link>
        </div>
      )}
    </header>
  )
}
