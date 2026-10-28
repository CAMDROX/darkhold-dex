import React, { useState, useEffect, useCallback } from 'react'
import {
  Flame,
  Timer,
  Zap,
  ArrowDown,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PlusCircle,
  Loader2,
  Tag,
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

    const handleAuctionCreated = (newAuction) => {
      if (newAuction?.event_symbol === selectedEvent?.symbol) {
        setAuctions((prev) => [newAuction, ...prev.filter((a) => a.id !== newAuction.id)])
        toast.custom(
          (t) => (
            <div className="bg-amber-950/95 border border-amber-500/50 text-amber-100 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">New Dutch Auction Live!</p>
                <p className="text-xs text-stone-300">
                  Ticket listed at ₹{newAuction.start_price} decaying to ₹{newAuction.reserve_price}
                </p>
              </div>
            </div>
          ),
          { duration: 4000 }
        )
      }
    }

    const handleAuctionSettled = (data) => {
      setAuctions((prev) =>
        prev.map((a) =>
          a.id === data.auction_id
            ? { ...a, status: 'SETTLED', clearing_price: data.clearing_price }
            : a
        )
      )
      // Remove settled auction after 3 seconds so users see the win banner
      setTimeout(() => {
        setAuctions((prev) => prev.filter((a) => a.id !== data.auction_id))
      }, 3500)
    }

    const handleAuctionExpired = (data) => {
      setAuctions((prev) => prev.filter((a) => a.id !== data.auction_id))
    }

    const unsubTick = subscribe('DUTCH_AUCTION_TICK', handleAuctionTick)
    const unsubCreated = subscribe('DUTCH_AUCTION_CREATED', handleAuctionCreated)
    const unsubSettled = subscribe('DUTCH_AUCTION_SETTLED', handleAuctionSettled)
    const unsubExpired = subscribe('DUTCH_AUCTION_EXPIRED', handleAuctionExpired)

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
    <div className="bg-[#12100E]/90 border border-amber-900/40 rounded-xl p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-950/60 mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-sm font-bold text-amber-200 tracking-wide">
                Dutch Auction Liquidation Feed
              </h3>
              <span className="text-[10px] font-mono bg-amber-950/80 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Live Price Decay
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Prices decay every second until claimed. First bidder takes the pass!
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Launch Auction</span>
        </button>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-500 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <p className="text-xs font-mono">Syncing active Dutch auctions...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-stone-800/80 rounded-lg p-6 bg-stone-950/30">
          <Timer className="w-8 h-8 text-stone-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-stone-300">No active Dutch auctions for {selectedEvent?.symbol || 'this market'}</p>
          <p className="text-[11px] text-stone-500 max-w-sm mx-auto mt-1">
            Need to liquidate an urgent festival pass? Launch a decaying auction to find a buyer immediately.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-3 inline-flex items-center space-x-1 px-3 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-mono transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Create First Auction</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {auctions.map((auc) => {
            const isSettled = auc.status === 'SETTLED'
            const isOwner = user?.id === auc.seller_id
            const progress = auc.progress_percentage || 0

            return (
              <div
                key={auc.id}
                className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                  isSettled
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-[#181412] border-amber-900/50 hover:border-amber-500/50 shadow-lg'
                }`}
              >
                {/* Visual Progress Decay Bar */}
                <div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-1000"
                  style={{ width: `${Math.min(100, Math.max(0, 100 - progress))}%` }}
                />

                {isSettled && (
                  <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center z-10">
                    <div className="flex items-center space-x-2 text-emerald-400 font-serif font-bold text-sm bg-emerald-950/90 border border-emerald-500/60 px-4 py-2 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sniped at ₹{auc.clearing_price?.toFixed(2) || auc.current_price?.toFixed(2)}!</span>
                    </div>
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold font-serif text-stone-100">
                        {auc.event_name || auc.event_symbol}
                      </span>
                      {isOwner && (
                        <span className="text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/30 px-1 rounded">
                          Your Listing
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">
                      Listed by: {auc.seller_username || 'Anonymous Seller'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-stone-900/80 border border-stone-800 text-[11px] font-mono text-amber-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(auc.time_remaining_seconds)}</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="bg-stone-950/80 border border-stone-900 rounded-lg p-3 mb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block mb-0.5">
                      Current Clearing Price
                    </span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-bold font-mono text-amber-400">
                        ₹{(auc.current_price || auc.start_price).toFixed(2)}
                      </span>
                      <TrendingDown className="w-3.5 h-3.5 text-amber-400/80 inline" />
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-stone-400 space-y-0.5">
                    <div>
                      Start: <span className="text-stone-300 line-through">₹{auc.start_price.toFixed(2)}</span>
                    </div>
                    <div>
                      Floor: <span className="text-emerald-400 font-semibold">₹{auc.reserve_price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  disabled={isSettled || isOwner || isSnipingId === auc.id}
                  onClick={() => handleSnipe(auc)}
                  className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    isOwner
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : isSettled
                      ? 'bg-emerald-900 text-emerald-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md hover:shadow-amber-500/20 active:scale-98'
                  }`}
                >
                  {isSnipingId === auc.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Locking & Settling...</span>
                    </>
                  ) : isOwner ? (
                    <span>Awaiting Bidder</span>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Snipe at ₹{(auc.current_price || auc.start_price).toFixed(2)}</span>
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

