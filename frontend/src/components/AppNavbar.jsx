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
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-[#090706]/95 border-b border-[#2A211B] shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Left: Side Panel Opener Logo/Icon & Brand Terminal Sigil */}
          <div className="flex items-center gap-3 sm:gap-5">
            
            {/* Side Panel Opener Button */}
            <button
              type="button"
              onClick={() => setSidePanelOpen(true)}
              className="p-2 rounded-xl bg-[#14100E] border border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#1F1813] text-[#F5D061] transition-all shadow-[0_0_12px_rgba(212,175,55,0.2)] group cursor-pointer"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <PanelLeft className="w-5 h-5 group-hover:scale-110 transition-transform text-[#F5D061]" />
            </button>

            {/* Brand Logo & Name */}
            <Link to={isAdmin ? '/admin/verifications' : '/dashboard'} className="flex items-center gap-3 group">
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
                    {isAdmin ? 'ADMIN' : 'EXCHANGE'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8E867A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>{isAdmin ? 'COMPLIANCE PORTAL' : 'SECONDARY MARKET'}</span>
                </div>
              </div>
            </Link>

            {/* Center Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-2 pl-4 border-l border-[#241E19]">
              {navTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <Link
                    key={tab.name}
                    to={tab.to}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                      tab.active
                        ? tab.highlight
                          ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.2)] font-bold'
                          : 'bg-[#1C1613] border border-[#3E2F26] text-white font-bold shadow-[0_0_10px_rgba(0,0,0,0.5)]'
                        : 'text-[#A8A195] hover:text-white hover:bg-[#181310] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${tab.active ? 'text-[#F5D061]' : 'text-[#8E867A]'}`} />
                    <span>{tab.name}</span>
                    {tab.isExternal && <ExternalLink className="w-3 h-3 opacity-50" />}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: Authenticated User Profile */}
          <div className="flex items-center gap-3">

            {/* User Profile Menu with KYC Badge */}
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

                  {/* KYC Status Badge */}
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
                        {isAdmin ? '👑 Compliance Admin' : 'Trader'}
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

                  {/* Admin Specific Menu */}
                  {isAdmin ? (
                    <>
                      <Link
                        to="/admin/verifications"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-mono text-[#F5D061] bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all font-semibold"
                      >
                        <Crown className="w-4 h-4 text-[#F5D061]" />
                        <span>Compliance KYC Review</span>
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                      >
                        <User className="w-4 h-4 text-[#F5D061]" />
                        <span>Profile & Security Sessions</span>
                      </Link>
                    </>
                  ) : (
                    /* Regular User Menu */
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                      >
                        <Layers className="w-4 h-4 text-[#D4AF37]" />
                        <span>Trading Terminal</span>
                      </Link>

                      <Link
                        to="/assets"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono text-[#D1C9BE] hover:text-white hover:bg-[#1E1916] transition-colors"
                      >
                        <Coins className="w-4 h-4 text-[#F5D061]" />
                        <span>Asset Vault & Balances</span>
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
                    </>
                  )}

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
              className="lg:hidden p-2 rounded-xl bg-[#14100E] border border-[#2D241E] text-[#D4AF37] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#241E19] bg-[#0A0807] px-4 py-4 space-y-2">
            {navTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Link
                  key={tab.name}
                  to={tab.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono ${
                    tab.active ? 'bg-[#1C1613] text-[#F5D061] font-bold border border-[#D4AF37]/30' : 'text-[#A8A195]'
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

      {/* Sliding Side Panel */}
      {sidePanelOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
          <div
            className="fixed inset-0 bg-[#040302]/80 backdrop-blur-md transition-opacity"
            onClick={() => setSidePanelOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-72 sm:w-80 bg-[#0C0A09] border-r border-[#D4AF37]/35 shadow-[25px_0_60px_rgba(0,0,0,0.95)] p-6 flex flex-col justify-between relative z-50">
              
              {/* Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#241E19]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/60 flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
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
                      <span className="block text-[9px] font-mono text-[#8E867A]">
                        {isAdmin ? 'ADMINISTRATION' : 'NAVIGATION'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSidePanelOpen(false)}
                    className="p-1.5 rounded-lg text-[#8E867A] hover:text-white hover:bg-[#1E1916] transition-colors cursor-pointer"
                    aria-label="Close Side Panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Side Panel Navigation Options */}
                <div className="space-y-2.5">
                  <div className="px-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E867A] font-bold">
                      {isAdmin ? 'COMPLIANCE TOOLS' : 'EXCHANGE APPS'}
                    </span>
                  </div>

                  {isAdmin ? (
                    <>
                      <Link
                        to="/admin/verifications"
                        onClick={() => setSidePanelOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all group ${
                          location.pathname === '/admin/verifications'
                            ? 'bg-gradient-to-r from-[#201813] to-[#14100E] border-[#D4AF37] text-white shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                            : 'bg-[#14100E] border-[#2A211B] text-[#D1C9BE] hover:text-white hover:border-[#D4AF37]/50 hover:bg-[#1C1613]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061]">
                            <Crown className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              KYC Review
                            </span>
                            <span className="text-[10px] font-mono text-[#8E867A]">
                              User Verifications Queue
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setSidePanelOpen(false)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A211B] bg-[#14100E] text-[#D1C9BE] hover:text-white hover:border-[#D4AF37]/50 hover:bg-[#1C1613] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061]">
                            <User className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Profile & Sessions
                            </span>
                            <span className="text-[10px] font-mono text-[#8E867A]">
                              Admin Security Settings
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/dashboard"
                        onClick={() => setSidePanelOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all group ${
                          location.pathname === '/dashboard'
                            ? 'bg-gradient-to-r from-[#201813] to-[#14100E] border-[#D4AF37] text-white shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                            : 'bg-[#14100E] border-[#2A211B] text-[#D1C9BE] hover:text-white hover:border-[#D4AF37]/50 hover:bg-[#1C1613]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061]">
                            <Layers className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Trading Terminal
                            </span>
                            <span className="text-[10px] font-mono text-[#8E867A]">
                              Live Secondary Order Book
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        to="/assets"
                        onClick={() => setSidePanelOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all group ${
                          location.pathname === '/assets'
                            ? 'bg-gradient-to-r from-[#201813] to-[#14100E] border-[#D4AF37] text-white shadow-[0_0_20px_rgba(212,175,55,0.25)]'
                            : 'bg-[#14100E] border-[#2A211B] text-[#D1C9BE] hover:text-white hover:border-[#D4AF37]/50 hover:bg-[#1C1613]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061]">
                            <Coins className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Asset Vault
                            </span>
                            <span className="text-[10px] font-mono text-[#8E867A]">
                              Fiat Balances & Tickets
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        to="/profile"
                        onClick={() => setSidePanelOpen(false)}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A211B] bg-[#14100E] text-[#D1C9BE] hover:text-white hover:border-[#D4AF37]/50 hover:bg-[#1C1613] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2A211B] to-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061]">
                            <User className="w-4.5 h-4.5 text-[#F5D061]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-sm block group-hover:text-[#F5D061] transition-colors">
                              Profile & Sessions
                            </span>
                            <span className="text-[10px] font-mono text-[#8E867A]">
                              Device & Identity Settings
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Footer: User Session Info */}
              <div className="pt-4 border-t border-[#241E19] flex items-center justify-between text-xs font-mono text-[#8E867A]">
                <div className="truncate max-w-[180px]">
                  <span className="block text-white font-bold truncate">{user?.username}</span>
                  <span className="text-[10px] text-[#8E867A] truncate">{user?.email}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#18261A] border border-[#22C55E]/40 text-[#22C55E]">
                  ONLINE
                </span>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
