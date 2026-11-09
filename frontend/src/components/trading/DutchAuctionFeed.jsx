import React, { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Timer,
  Zap,
  TrendingDown,
  CheckCircle2,
  Clock,
  PlusCircle,
  Loader2,
} from 'lucide-react'
import { auctionsApi } from '../../services/api'
import { useWebSocket } from '../../context/WebSocketContext'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import CreateDutchAuctionModal from './CreateDutchAuctionModal'

export default function DutchAuctionFeed({ selectedEvent, onBalanceRefresh }) {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()
  const [auctions, setAuctions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSnipingId, setIsSnipingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isKycVerified = (user?.kyc_status || '').toLowerCase() === 'verified'

  // Fetch active auctions via REST
  const fetchAuctions = useCallback(async () => {
    if (!selectedEvent?.symbol) return
    setIsLoading(true)
    try {
      const res = await auctionsApi.getAuctions(selectedEvent.symbol)
      if (res?.success && Array.isArray(res.auctions)) {
        setAuctions(res.auctions)
      }
    } catch (err) {
      console.error('[DutchAuctionFeed] Error fetching auctions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedEvent?.symbol])

  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  // WebSocket Listeners for real-time price decay ticks and events
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
      unsubTick()
      unsubCreated()
      unsubSettled()
      unsubExpired()
    }
  }, [selectedEvent?.symbol, subscribe])

  // Snipe auction execution
  const handleSnipe = async (auction) => {
    if (!isKycVerified) {
      toast.error('Identity verification required to snipe Dutch auctions!')
      return
    }
    if (auction.seller_id === user?.id) {
      toast.error('You cannot buy an auction you created yourself!')
      return
    }

    setIsSnipingId(auction.id)
    try {
      const res = await auctionsApi.snipeAuction(auction.id)
      if (res?.status === 'SUCCESS') {
        toast.success(`⚡ SNIPED! Ticket secured at ₹${res.clearing_price}. QR code generated in your Vault!`, {
          duration: 5000,
          icon: '🎉',
        })
        if (onBalanceRefresh) onBalanceRefresh()
        setAuctions((prev) => prev.filter((a) => a.id !== auction.id))
      }
    } catch (err) {
      const errMsg = err?.message || err?.data?.message || 'Failed to snipe auction'
      toast.error(errMsg)
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

  return (
    <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
            <Flame className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-cinzel text-base font-bold text-white tracking-wide">
                Dutch Auction Liquidation Feed
              </h3>
              <span className="text-[10px] font-mono bg-[#D4AF37]/15 text-[#F5D061] border border-[#D4AF37]/40 px-2 py-0.5 rounded-md font-semibold">
                Live Price Decay
              </span>
            </div>
            <p className="text-xs text-white/50 font-mono mt-0.5">
              Prices decay every second until claimed. First bidder takes the pass!
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/45 hover:border-[#D4AF37] text-[#F5D061] font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-[0_4px_16px_rgba(212,175,55,0.2)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Launch Auction</span>
        </button>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-white/40 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#F5D061]" />
          <p className="text-xs font-mono">Syncing active Dutch auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/[0.08] rounded-2xl p-6 bg-white/[0.01]">
          <Timer className="w-8 h-8 text-white/30 mx-auto mb-2" />
          <p className="text-xs font-semibold text-white/80">No active Dutch auctions for {selectedEvent?.symbol || 'this market'}</p>
          <p className="text-[11px] text-white/40 max-w-sm mx-auto mt-1">
            Need to liquidate an urgent festival pass? Launch a decaying auction to find a buyer immediately.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#D4AF37]/50 text-[#F5D061] text-xs font-mono transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create First Auction</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auctions.map((auc) => {
            const isSettled = auc.status === 'SETTLED'
            const isOwner = user?.id === auc.seller_id
            const progress = auc.progress_percentage || 0

            return (
              <div
                key={auc.id}
                className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] ${
                  isSettled
                    ? 'bg-[#22C55E]/5 border-[#22C55E]/40'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-[#D4AF37]/50'
                }`}
              >
                {/* Visual Progress Decay Bar */}
                <div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#22C55E] transition-all duration-1000 shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                  style={{ width: `${Math.min(100, Math.max(0, 100 - progress))}%` }}
                />

                {isSettled && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="flex items-center space-x-2 text-[#22C55E] font-cinzel font-bold text-sm bg-[#22C55E]/15 border border-[#22C55E]/50 px-4 py-2 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sniped at ₹{(auc.clearing_price != null ? Math.round(auc.clearing_price) : Math.round(auc.current_price || 0)).toLocaleString()}!</span>
                    </div>
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between mb-3.5">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold font-cinzel text-white">
                        {auc.event_name || auc.event_symbol}
                      </span>
                      {isOwner && (
                        <span className="text-[10px] font-mono bg-white/[0.08] text-white/80 border border-white/[0.15] px-1.5 py-0.5 rounded-md">
                          Your Listing
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/40 font-mono mt-0.5 block">
                      Seller: {auc.seller_username || 'Anonymous Seller'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-[#F5D061]">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(auc.time_remaining_seconds)}</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 mb-3.5 flex items-center justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-0.5">
                      Current Clearing Price
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-bold font-mono text-[#F5D061]">
                        ₹{Math.round(auc.current_price || auc.start_price || 0).toLocaleString()}
                      </span>
                      <TrendingDown className="w-3.5 h-3.5 text-[#F5D061]/80 inline" />
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-white/50 space-y-0.5">
                    <div>
                      Start: <span className="text-white/40 line-through">₹{Math.round(auc.start_price || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      Floor: <span className="text-[#22C55E] font-semibold">₹{Math.round(auc.reserve_price || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  disabled={isSettled || isOwner || isSnipingId === auc.id}
                  onClick={() => handleSnipe(auc)}
                  className={`w-full py-2.5 px-4 rounded-xl font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-0.5 active:scale-98 ${
                    isOwner
                      ? 'bg-white/[0.04] text-white/40 border border-white/[0.06] cursor-not-allowed'
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
                      <span>Snipe at ₹{Math.round(auc.current_price || auc.start_price || 0).toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <CreateDutchAuctionModal
          selectedEvent={selectedEvent}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            fetchAuctions()
            if (onBalanceRefresh) onBalanceRefresh()
          }}
        />
      )}
    </div>
  )
}
