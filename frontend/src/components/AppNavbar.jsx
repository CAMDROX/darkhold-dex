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
  ChevronRight,
  ExternalLink,
  Menu,
  X,
  Coins,
  Wallet,
  PanelLeft,
  Sparkles,
} from 'lucide-react'

export default function AppNavbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
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

  // Close side panel on Escape key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSidePanelOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // User Navbar vs Admin Navbar Navigation Links
  const navTabs = isAdmin
    ? [
        {
          name: 'Compliance KYC Review',
          to: '/admin/verifications',
          icon: Crown,
          active: location.pathname === '/admin/verifications',
          highlight: true,
        },
        {
          name: 'Profile & Security Sessions',
          to: '/profile',
          icon: User,
          active: location.pathname === '/profile',
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
          name: 'Asset Vault & Balances',
          to: '/assets',
          icon: Coins,
          active: location.pathname === '/assets',
        },
        {
          name: 'Profile & Security Sessions',
          to: '/profile',
          icon: User,
          active: location.pathname === '/profile',
        },
        {
          name: 'Public Landing Site',
          to: '/',
          icon: ExternalLink,
          active: location.pathname === '/',
          isExternal: true,
        },
      ]

  return (
    <>
      {/* Spatial Floating Flight-Deck Navbar */}
      <header className="sticky top-0 z-40 w-full px-3 sm:px-6 lg:px-8 pt-3 pb-2 transition-all duration-300">
        <div className="max-w-7xl mx-auto rounded-2xl spatial-glass px-4 sm:px-6 h-16 flex items-center justify-between relative">
          
          {/* Left: Side Panel Opener Logo/Icon & Brand Terminal Sigil */}
          <div className="flex items-center gap-3 sm:gap-5">
            
            {/* Side Panel Opener Button with Spatial Micro-Interaction */}
            <button
              type="button"
              onClick={() => setSidePanelOpen(true)}
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#D4AF37]/50 text-[#F5D061] transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] group cursor-pointer"
              title="Open Navigation Console"
              aria-label="Open Navigation Menu"
            >
              <PanelLeft className="w-4.5 h-4.5 group-hover:rotate-6 transition-transform duration-300 text-[#F5D061]" />
            </button>

            {/* Brand Logo & Name (Strictly Preserving Identity) */}
            <Link
              to={isAdmin ? '/admin/verifications' : '/dashboard'}
              className="flex items-center gap-3 group transition-transform duration-300 hover:scale-[1.01]"
            >
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#241B15] to-[#0D0B0A] border border-[#D4AF37]/45 flex items-center justify-center p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:border-[#D4AF37] group-hover:shadow-[0_0_24px_rgba(212,175,55,0.45)] group-hover:scale-105 transition-all duration-300">
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
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="tracking-wide">{isAdmin ? 'COMPLIANCE PORTAL' : 'SECONDARY MARKET'}</span>
                </div>
              </div>
            </Link>

            {/* Center Navigation Tabs with Spatial Pill Elevation */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-2 pl-4 border-l border-white/[0.08]">
              {navTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <Link
                    key={tab.name}
                    to={tab.to}
                    className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all duration-300 ${
                      tab.active
                        ? tab.highlight
                          ? 'bg-gradient-to-b from-[#D4AF37]/25 to-[#D4AF37]/10 border border-[#D4AF37]/60 text-[#F5D061] font-bold shadow-[0_0_20px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] scale-[1.02]'
                          : 'bg-white/[0.08] border border-white/[0.15] text-white font-bold shadow-[0_4px_16px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] scale-[1.02]'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] hover:-translate-y-0.5 hover:scale-[1.02]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${tab.active ? 'text-[#F5D061]' : 'text-white/40 group-hover:text-white/80'}`} />
                    <span>{tab.name}</span>
                    {tab.isExternal && <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white/80" />}
                    {tab.active && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: Authenticated User Profile & Micro-Interactions */}
          <div className="flex items-center gap-3">

            {/* User Profile Pill Trigger with Spatial Depth */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border transition-all duration-300 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 ${
                  profileDropdownOpen ? 'border-[#D4AF37]/60 shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-white/[0.08] hover:border-[#D4AF37]/40'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/50 flex items-center justify-center font-cinzel font-bold text-xs text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
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

                  {/* KYC Status Badge with Dynamic Spatial Glow */}
                  {kycStatus === 'verified' ? (
                    <span className="block text-[10px] font-mono text-[#22C55E] leading-tight flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span className="opacity-90">Verified</span>
                    </span>
                  ) : kycStatus === 'pending' ? (
                    <span className="block text-[10px] font-mono text-[#F5D061] leading-tight flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span className="opacity-90">Pending Review</span>
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

              {/* Profile Dropdown Menu: Spatial Popover */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-76 rounded-2xl bg-[#0D0A08]/92 backdrop-blur-2xl border border-white/[0.12] spatial-popover p-2.5 z-50 space-y-1.5">
                  
                  {/* User Header Card with Subtle Glass Inset */}
                  <div className="px-3.5 py-3 border border-white/[0.06] bg-white/[0.03] rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono font-bold text-white truncate">{user?.username}</p>
                      <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${
                        isAdmin 
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#F5D061]' 
                          : 'bg-white/[0.05] border-white/[0.1] text-white/70'
                      }`}>
                        {isAdmin ? '👑 Compliance Admin' : 'Trader'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-white/50 truncate mt-0.5">{user?.email}</p>
                    
                    {/* Status Tag */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/40 uppercase tracking-wider">KYC Verification</span>
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

                  {/* Admin Specific Menu */}
                  {isAdmin ? (
                    <div className="space-y-1 pt-1">
                      <Link
                        to="/admin/verifications"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#F5D061] bg-[#D4AF37]/10 border border-[#D4AF37]/35 hover:bg-[#D4AF37]/20 hover:-translate-y-0.5 transition-all duration-200 font-semibold shadow-[0_2px_8px_rgba(212,175,55,0.15)]"
                      >
                        <Crown className="w-4 h-4 text-[#F5D061]" />
                        <span>Compliance KYC Review</span>
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <User className="w-4 h-4 text-[#F5D061]" />
                        <span>Profile & Security Sessions</span>
                      </Link>
                    </div>
                  ) : (
                    /* Regular User Menu */
                    <div className="space-y-1 pt-1">
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <Layers className="w-4 h-4 text-[#D4AF37]" />
                        <span>Trading Terminal</span>
                      </Link>

                      <Link
                        to="/assets"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <Coins className="w-4 h-4 text-[#F5D061]" />
                        <span>Asset Vault & Balances</span>
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <User className="w-4 h-4 text-[#F5D061]" />
                        <span>Profile & Security Sessions</span>
                      </Link>

                      <Link
                        to="/"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-white/50 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <ExternalLink className="w-4 h-4 text-white/40" />
                        <span>Public Landing Site</span>
                      </Link>
                    </div>
                  )}

                  {/* Sign Out Action with Crimson Glow */}
                  <div className="pt-1.5 border-t border-white/[0.06]">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        logout()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#EF4444] bg-[#EF4444]/5 hover:bg-[#EF4444]/15 border border-transparent hover:border-[#EF4444]/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out Current Device</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button with Spatial Ripple */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[#D4AF37] cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu (Spatial Drop) */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-2 rounded-2xl spatial-glass p-3 space-y-1.5 animate-spatial-pop">
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
                      : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  {tab.isExternal && <ExternalLink className="w-3 h-3 ml-auto opacity-50" />}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Spatial Side Console Drawer */}
      {sidePanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setSidePanelOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-80 sm:w-88 bg-[#0D0A08]/92 backdrop-blur-2xl border-r border-white/[0.1] shadow-[30px_0_80px_rgba(0,0,0,0.98),0_0_40px_rgba(212,175,55,0.06),inset_1px_0_0_rgba(255,255,255,0.1)] p-6 flex flex-col justify-between relative z-50 animate-in slide-in-from-left duration-300">
              
              {/* Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/60 flex items-center justify-center p-1.5 shadow-[0_0_18px_rgba(212,175,55,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="#D4AF37" strokeWidth="6" strokeDasharray="6 3" />
                        <polygon points="50,16 80,72 20,72" fill="none" stroke="#D4AF37" strokeWidth="6" />
                        <polygon points="50,84 20,28 80,28" fill="none" stroke="#EF4444" strokeWidth="5" />
                        <circle cx="50" cy="50" r="14" fill="#EF4444" />
                      </svg>
                    </div>
                    <div>
                      <span className="font-cinzel font-black tracking-widest text-base text-transparent bg-clip-text bg-gradient-to-r from-white to-[#D4AF37]">
                        DARKHOLD
                      </span>
                      <span className="block text-[9px] font-mono text-white/50">
                        {isAdmin ? 'ADMINISTRATION CONSOLE' : 'SPATIAL CONSOLE'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSidePanelOpen(false)}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    aria-label="Close Side Panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Side Panel Navigation Cards */}
                <div className="space-y-2.5">
                  <div className="px-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">
                      {isAdmin ? 'COMPLIANCE APPS' : 'EXCHANGE MODULES'}
                    </span>
                  </div>

                  {isAdmin ? (
                    <>
                      <Link
                        to="/admin/verifications"
                        onClick={() => setSidePanelOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 group ${
                          location.pathname === '/admin/verifications'
                            ? 'bg-gradient-to-r from-[#201813] to-[#14100E] border-[#D4AF37] text-white shadow-[0_0_25px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] scale-[1.01]'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:text-white hover:border-[#D4AF37]/50 hover:bg-white/[0.05] hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <Crown className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              KYC Review
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              User Verifications Queue
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setSidePanelOpen(false)}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-white/70 hover:text-white hover:border-[#D4AF37]/50 hover:bg-white/[0.05] hover:-translate-y-0.5 transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <User className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Profile & Sessions
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              Admin Security Settings
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setSidePanelOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 group ${
                          location.pathname === '/dashboard'
                            ? 'bg-gradient-to-r from-[#201813] to-[#14100E] border-[#D4AF37] text-white shadow-[0_0_25px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] scale-[1.01]'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:text-white hover:border-[#D4AF37]/50 hover:bg-white/[0.05] hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <Layers className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Trading Terminal
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              Live Secondary Order Book
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>

                      <Link
                        to="/assets"
                        onClick={() => setSidePanelOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 group ${
                          location.pathname === '/assets'
                            ? 'bg-gradient-to-r from-[#201813] to-[#14100E] border-[#D4AF37] text-white shadow-[0_0_25px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] scale-[1.01]'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/70 hover:text-white hover:border-[#D4AF37]/50 hover:bg-white/[0.05] hover:-translate-y-0.5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <Coins className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Asset Vault
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              Fiat Balances & Tickets
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setSidePanelOpen(false)}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-white/70 hover:text-white hover:border-[#D4AF37]/50 hover:bg-white/[0.05] hover:-translate-y-0.5 transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                            <User className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Profile & Sessions
                            </span>
                            <span className="text-[10px] font-mono text-white/50">
                              Device & Identity Settings
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-1 transition-transform duration-300" />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Footer: User Session Info */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <div className="truncate max-w-[180px]">
                  <span className="block text-white font-bold truncate">{user?.username}</span>
                  <span className="text-[10px] text-white/40 truncate">{user?.email}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>ONLINE</span>
                </span>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
