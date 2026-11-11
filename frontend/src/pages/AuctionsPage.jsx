import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Gavel,
  Flame,
  Zap,
  TrendingDown,
  Timer,
  Clock,
  ShieldCheck,
  PlusCircle,
  Coins,
  Ticket,
  Wallet,
  Calendar,
  Layers,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import { ticketsApi, walletApi, auctionsApi } from '../services/api'
import { notify } from '../utils/notification'
import CreateDutchAuctionModal from '../components/trading/CreateDutchAuctionModal'
import SimulatedDepositModal from '../components/SimulatedDepositModal'
import ImportTicketModal from '../components/ImportTicketModal'
import ThemedDropdown from '../components/ThemedDropdown'

export default function AuctionsPage() {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()
  const isKycVerified = (user?.kyc_status || '').toLowerCase() === 'verified'

  // Modal States
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Events & Market Selection
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [_isLoadingEvents, setIsLoadingEvents] = useState(true)

  // Balances
  const [availableFiat, setAvailableFiat] = useState(0)
  const [availableRelics, setAvailableRelics] = useState(0)

  // Auctions Data State
  const [auctions, setAuctions] = useState([])
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(false)
  const [isSnipingId, setIsSnipingId] = useState(null)
  const [filterMode, setFilterMode] = useState('ALL') // 'ALL' | 'ACTIVE' | 'MINE'

  // 1. Fetch Events
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    try {
      const data = await ticketsApi.getEvents()
      const list = Array.isArray(data) ? data : data?.events || []
      setEvents(list)
      if (list.length > 0) {
        setSelectedEvent((prev) => {
          if (prev) {
            return list.find((e) => e.symbol === prev.symbol) || list[0]
          }
          return list.find((e) => e.symbol === 'WEBSTER_26') || list[0]
        })
      }
    } catch (err) {
      console.error('[AuctionsPage] Error fetching events:', err)
    } finally {
      setIsLoadingEvents(false)
    }
  }, [])

  // 2. Fetch User Balances
  const fetchUserBalances = useCallback(async () => {
    try {
      const resp = await walletApi.getBalances()
      if (resp && resp.balances) {
        const inrItem = resp.balances.find((b) => b.currency === 'INR' && b.account_type === 'AVAILABLE')
        setAvailableFiat(inrItem ? inrItem.balance : 0)
      }
    } catch (err) {
      console.error('[AuctionsPage] Error fetching balances:', err)
    }
  }, [])

  // 3. Fetch User Relics for currently selected event
  const fetchUserRelics = useCallback(async () => {
    try {
      const resp = await ticketsApi.getMyRelics()
      const list = Array.isArray(resp) ? resp : resp?.relics || []
      const available = list.filter((r) => r.status === 'AVAILABLE')
      if (selectedEvent) {
        const matching = available.filter(
          (r) => r.event_symbol === selectedEvent.symbol || r.event_id === selectedEvent.id
        )
        setAvailableRelics(matching.length)
      } else {
        setAvailableRelics(available.length)
      }
    } catch (err) {
      console.error('[AuctionsPage] Error fetching relics:', err)
    }
  }, [selectedEvent])

  // 4. Fetch Active Dutch Auctions
  const fetchAuctions = useCallback(async () => {
    if (!selectedEvent?.symbol) return
    setIsLoadingAuctions(true)
    try {
      const res = await auctionsApi.getAuctions(selectedEvent.symbol)
      if (res?.success && Array.isArray(res.auctions)) {
        setAuctions(res.auctions)
      }
    } catch (err) {
      console.error('[AuctionsPage] Error fetching auctions:', err)
    } finally {
      setIsLoadingAuctions(false)
    }
  }, [selectedEvent?.symbol])

  // Initial Data Load
  useEffect(() => {
    fetchEvents()
    fetchUserBalances()
  }, [fetchEvents, fetchUserBalances])

  // On Event Change: reload relics & auctions
  useEffect(() => {
    if (selectedEvent) {
      fetchAuctions()
      fetchUserRelics()
    }
  }, [selectedEvent, fetchAuctions, fetchUserRelics])

  // 5. WebSocket Subscriptions for Price Decay & Lifecycle
  useEffect(() => {
    const handleAuctionTick = (data) => {
      if (!Array.isArray(data?.updates)) return
      const updateMap = new Map(data.updates.map((u) => [u.auction_id, u]))

      setAuctions((prev) =>
        prev.map((auc) => {
          const upd = updateMap.get(auc.id)
          if (upd) {
            return {
              ...auc,
              current_price: upd.current_price,
              time_remaining_seconds: upd.time_remaining_seconds,
              progress_percentage: upd.progress_percentage,
            }
          }
          return auc
        })
      )
    }

    const handleAuctionCreated = (newAuc) => {
      if (
        !newAuc?.event_symbol ||
        newAuc.event_symbol.toUpperCase() === (selectedEvent?.symbol || '').toUpperCase()
      ) {
        setAuctions((prev) => [newAuc, ...prev])
      }
    }

    const handleAuctionSettled = (settledData) => {
      setAuctions((prev) =>
        prev.map((auc) => {
          if (auc.id === settledData.auction_id) {
            return {
              ...auc,
              status: 'SETTLED',
              clearing_price: settledData.clearing_price,
            }
          }
          return auc
        })
      )
    }

    const handleAuctionExpired = (expiredData) => {
      setAuctions((prev) => prev.filter((a) => a.id !== expiredData.auction_id))
    }

    const unsubTick = subscribe('DUTCH_AUCTION_TICK', handleAuctionTick)
    const unsubCreated = subscribe('AUCTION_CREATED', handleAuctionCreated)
    const unsubSettled = subscribe('AUCTION_SETTLED', handleAuctionSettled)
    const unsubExpired = subscribe('AUCTION_EXPIRED', handleAuctionExpired)

    return () => {
      unsubTick?.()
      unsubCreated?.()
      unsubSettled?.()
      unsubExpired?.()
    }
  }, [selectedEvent?.symbol, subscribe])

  // Snipe auction execution
  const handleSnipe = async (auction) => {
    if (!isKycVerified) {
      notify.error(
        'Identity Verification Required',
        'Please complete identity verification (KYC) before purchasing from Dutch auctions.'
      )
      return
    }
    if (auction.seller_id === user?.id) {
      notify.warning('Action Not Allowed', 'You cannot purchase your own auction listing.')
      return
    }

    setIsSnipingId(auction.id)
    try {
      const res = await auctionsApi.snipeAuction(auction.id)
      if (res?.status === 'SUCCESS') {
        notify.auctionSniped({
          eventSymbol: auction.event_symbol || auction.event_name,
          price: res.clearing_price,
        })
        fetchUserBalances()
        fetchUserRelics()
        setAuctions((prev) => prev.filter((a) => a.id !== auction.id))
      }
    } catch (err) {
      const errMsg = err?.message || err?.data?.message || 'Failed to purchase auction ticket'
      notify.error('Auction Purchase Failed', errMsg)
    } finally {
      setIsSnipingId(null)
    }
  }

  // Format seconds to mm:ss
  const formatTime = (totalSec) => {
    if (!totalSec || totalSec <= 0) return '00:00'
    const m = Math.floor(totalSec / 60)
    const s = Math.floor(totalSec % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Filtered auctions
  const displayedAuctions = auctions.filter((auc) => {
    if (filterMode === 'ACTIVE') return auc.status !== 'SETTLED'
    if (filterMode === 'MINE') return auc.seller_id === user?.id
    return true
  })

  return (
    <div className="min-h-[85vh] py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* 1. Spatial HUD: Welcome & Quick Balances */}
      <div className="relative rounded-3xl spatial-glass p-6 sm:p-7 overflow-hidden shadow-lg shadow-black/40 transition-all duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 via-[#F5D061]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-xs font-mono text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <Flame className="w-3.5 h-3.5 text-[#F5D061]" />
              <span className="font-semibold tracking-wide">PRICE-DECAY AUCTIONS · FIXED-PRICE INSTANT PURCHASE</span>
            </div>
            
            <h1 className="font-sans font-black text-2xl sm:text-3xl text-white tracking-wide">
              Dutch Auction Liquidations —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5D061] to-[#D4AF37]">
                {selectedEvent?.name || 'Festival Market'}
              </span>
            </h1>

            {/* Wallet HUD Cluster */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs font-mono text-white/75">
                Trader: <strong className="text-white font-mono">{user?.username}</strong>
              </span>
              <span className="text-white/75">|</span>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Wallet className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-white/75 text-xs font-mono">Available Fiat:</span>
                <span className="text-[#22C55E] font-bold font-mono text-xs">₹{(availableFiat || 0).toLocaleString()}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Ticket className="w-3.5 h-3.5 text-[#F5D061]" />
                <span className="text-white/75 text-xs font-mono">Eligible Tickets:</span>
                <span className="text-[#F5D061] font-bold font-mono text-xs">{availableRelics || 0} in vault</span>
              </div>
            </div>
          </div>

          {/* Quick HUD Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:brightness-110 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.35)]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Launch Auction</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/45 hover:border-[#D4AF37] transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.2)]"
            >
              <Coins className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>Deposit INR</span>
            </button>

            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 hover:border-white/25 transition-all duration-300 flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Order Terminal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Mechanism Bento: How Dutch Auctions Eliminate Scalping */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl spatial-glass p-4.5 border border-white/20 relative overflow-hidden group hover:border-[#D4AF37]/40 transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#F5D061] border border-[#D4AF37]/30">
              <TrendingDown className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-bold text-sm text-white">1. Real-Time Price Decay</h3>
          </div>
          <p className="text-xs font-mono text-white/75 leading-relaxed">
            The pass starts at the maximum dynamic price collar (e.g. ₹60) and steadily ticks down every single second toward the seller's reserve floor.
          </p>
        </div>

        <div className="rounded-2xl spatial-glass p-4.5 border border-white/20 relative overflow-hidden group hover:border-[#22C55E]/40 transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-bold text-sm text-white">2. First-Buyer Instant Settlement</h3>
          </div>
          <p className="text-xs font-mono text-white/75 leading-relaxed">
            No bidding wars or automated bots. The first buyer to accept the current displayed price secures the ticket immediately.
          </p>
        </div>

        <div className="rounded-2xl spatial-glass p-4.5 border border-white/20 relative overflow-hidden group hover:border-[#F5D061]/40 transition-all duration-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-[#F5D061]/10 text-[#F5D061] border border-[#F5D061]/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-sans font-bold text-sm text-white">3. Verified QR Re-Issuance</h3>
          </div>
          <p className="text-xs font-mono text-white/75 leading-relaxed">
            The old barcode is permanently invalidated in PostgreSQL and a fresh SHA-256 cryptographic QR pass is instantly minted to the buyer's vault.
          </p>
        </div>
      </div>

      {/* 3. Event Selector Dropdown & Filter Bar */}
      <div className="rounded-3xl spatial-glass p-4 sm:p-5 border border-white/20 shadow-[0_12px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Festival Dropdown (Matches Trading Terminal MarketHeader) */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-white/75 mb-1.5">
              Active Auction Market
            </label>
            <ThemedDropdown
              variant="prominent"
              ariaLabel="Active Auction Market"
              value={selectedEvent?.symbol || ''}
              onChange={(sym) => {
                const evt = (events || []).find((item) => item.symbol === sym)
                if (evt) setSelectedEvent(evt)
              }}
              minMenuWidth={300}
              options={(events || []).map((evt) => ({
                value: evt.symbol,
                label: `${evt.name} (${evt.symbol})`,
                badge: evt.max_sell_price ? `Cap ₹${evt.max_sell_price}` : undefined,
              }))}
            />
          </div>

          {selectedEvent?.event_date && (
            <div className="pt-4 sm:pt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/20 text-xs font-mono shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Calendar className="w-3.5 h-3.5 text-[#F5D061]" />
                <span className="text-white/75">Event Date:</span>
                <span className="text-[#F5D061] font-semibold">
                  {new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-[#181B24] p-1.5 rounded-2xl border border-white/20 self-start lg:self-end">
          {[
            { id: 'ALL', label: 'All Auctions' },
            { id: 'ACTIVE', label: 'Active Only' },
            { id: 'MINE', label: 'My Listings' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setFilterMode(mode.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer ${
                filterMode === mode.id
                  ? 'bg-white/[0.1] text-[#F5D061] font-semibold border border-[#D4AF37]/40 shadow-xs'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Live Auctions Feed Grid */}
      <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-lg shadow-black/40 transition-all duration-300">
        
        {/* Sub-header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <Gavel className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-sans text-base font-bold text-white tracking-wide">
                  Live Decaying Listings ({displayedAuctions.length})
                </h3>
                <span className="text-[10px] font-mono bg-[#D4AF37]/15 text-[#F5D061] border border-[#D4AF37]/40 px-2 py-0.5 rounded-md font-semibold">
                  Ticking Live
                </span>
              </div>
              <p className="text-xs text-white/75 font-mono mt-0.5">
                Market: <span className="text-white font-bold">{selectedEvent?.name}</span> · Max dynamic collar: <span className="text-[#22C55E]">₹{selectedEvent?.max_sell_price || 60}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/45 hover:border-[#D4AF37] text-[#F5D061] font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-[0_4px_16px_rgba(212,175,55,0.2)] cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Launch Auction</span>
          </button>
        </div>

        {/* Content */}
        {isLoadingAuctions ? (
          <div className="py-16 flex flex-col items-center justify-center text-white/75 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#F5D061]" />
            <p className="text-xs font-mono tracking-wider">Syncing active Dutch auctions from matching engine...</p>
          </div>
        ) : displayedAuctions.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/20 rounded-2xl p-8 bg-white/[0.07]">
            <Timer className="w-10 h-10 text-white/75 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white/90">No active Dutch auctions found</p>
            <p className="text-xs text-white/75 max-w-md mx-auto mt-1 font-mono">
              {filterMode === 'MINE'
                ? "You haven't listed any festival passes for Dutch auction yet."
                : `No active liquidations in progress for ${selectedEvent?.name || 'this event'}. Be the first to create one!`}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-black font-sans font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Launch First Auction</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedAuctions.map((auc) => {
              const isSettled = auc.status === 'SETTLED'
              const isOwner = user?.id === auc.seller_id
              const progress = auc.progress_percentage || 0

              return (
                <div
                  key={auc.id}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col justify-between ${
                    isSettled
                      ? 'bg-[#22C55E]/5 border-[#22C55E]/40'
                      : 'bg-white/[0.05] border-white/20 hover:border-[#D4AF37]/50'
                  }`}
                >
                  {/* Visual Progress Decay Bar */}
                  <div
                    className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#22C55E] transition-all duration-1000 shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                    style={{ width: `${Math.min(100, Math.max(0, 100 - progress))}%` }}
                  />

                  {isSettled && (
                    <div className="absolute inset-0 bg-[#14161C]/80 backdrop-blur-xs flex items-center justify-center z-10 p-4">
                      <div className="flex items-center space-x-2 text-[#22C55E] font-sans font-bold text-sm bg-[#22C55E]/15 border border-[#22C55E]/50 px-4 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Purchased at ₹{(auc.clearing_price != null ? Math.round(auc.clearing_price) : Math.round(auc.current_price || 0)).toLocaleString()}!</span>
                      </div>
                    </div>
                  )}

                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-3.5">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold font-sans text-white">
                            {auc.event_name || auc.event_symbol}
                          </span>
                          {isOwner && (
                            <span className="text-[10px] font-mono bg-[#D4AF37]/20 text-[#F5D061] border border-[#D4AF37]/40 px-2 py-0.5 rounded-md font-semibold">
                              Your Listing
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/75 font-mono mt-0.5 block">
                          Seller: {auc.seller_username || 'Anonymous Seller'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/20 text-xs font-mono text-[#F5D061]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(auc.time_remaining_seconds)}</span>
                      </div>
                    </div>

                    {/* Price Display */}
                    <div className="bg-[#181B24] border border-white/20 rounded-xl p-3.5 mb-4 flex items-center justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-white/75 block mb-0.5">
                          Current Price
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-2xl font-bold font-mono text-[#F5D061]">
                            ₹{Math.round(auc.current_price || auc.start_price || 0).toLocaleString()}
                          </span>
                          <TrendingDown className="w-4 h-4 text-[#F5D061]/80 inline" />
                        </div>
                      </div>

                      <div className="text-right text-[11px] font-mono text-white/75 space-y-0.5">
                        <div>
                          Start: <span className="text-white/75 line-through">₹{Math.round(auc.start_price || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          Floor: <span className="text-[#22C55E] font-semibold">₹{Math.round(auc.reserve_price || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={isSettled || isOwner || isSnipingId === auc.id}
                    onClick={() => handleSnipe(auc)}
                    className={`w-full py-2.5 px-4 rounded-xl font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer shadow-lg ${
                      isOwner
                        ? 'bg-white/[0.07] text-white/75 border border-white/20 cursor-not-allowed'
                        : isSettled
                        ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]'
                    }`}
                  >
                    {isSnipingId === auc.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                        <span>Locking & Settling...</span>
                      </>
                    ) : isOwner ? (
                      <span>Awaiting Bidder</span>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current text-black" />
                        <span>Buy Now at ₹{Math.round(auc.current_price || auc.start_price || 0).toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 5. Modals */}
      <SimulatedDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={() => {
          fetchUserBalances()
          setIsDepositModalOpen(false)
        }}
      />

      <ImportTicketModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onTicketQueued={() => {
          setIsImportModalOpen(false)
          fetchUserRelics()
        }}
      />

      {isCreateModalOpen && (
        <CreateDutchAuctionModal
          selectedEvent={selectedEvent}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchAuctions()
            fetchUserRelics()
            setIsCreateModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
