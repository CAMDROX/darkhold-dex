import React, { useState, useEffect } from 'react'
import {
  X,
  Flame,
  Timer,
  AlertTriangle,
  Loader2,
  Ticket,
  TrendingDown,
  Info,
} from 'lucide-react'
import { ticketsApi, auctionsApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function CreateDutchAuctionModal({
  selectedEvent,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [relics, setRelics] = useState([])
  const [isLoadingRelics, setIsLoadingRelics] = useState(false)
  const [selectedRelicId, setSelectedRelicId] = useState('')
  const [startPrice, setStartPrice] = useState('')
  const [reservePrice, setReservePrice] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(15)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [collarError, setCollarError] = useState('')

  const maxSellPrice = selectedEvent?.max_sell_price || 0
  const faceValue = selectedEvent?.face_value || 0

  // Fetch available relics owned by this user for the event
  useEffect(() => {
    if (!isOpen) return
    const fetchRelics = async () => {
      setIsLoadingRelics(true)
      try {
        const res = await ticketsApi.getMyRelics()
        const rawList = Array.isArray(res) ? res : (res?.relics || [])
        // Filter by selectedEvent and AVAILABLE status
        const available = rawList.filter(
          (r) =>
            r.status === 'AVAILABLE' &&
            (r.event_symbol === selectedEvent?.symbol || r.event_id === selectedEvent?.id)
        )
        setRelics(available)
        if (available.length > 0) {
          setSelectedRelicId(available[0].id)
        }
      } catch (err) {
        console.error('Failed to load user relics:', err)
      } finally {
        setIsLoadingRelics(false)
      }
    }

    fetchRelics()

    // Pre-populate sensible prices
    if (faceValue > 0) {
      setStartPrice(maxSellPrice > 0 ? String(Math.round(maxSellPrice * 0.95)) : String(Math.round(faceValue * 1.2)))
      setReservePrice(String(Math.round(faceValue * 0.8)))
    }
  }, [isOpen, selectedEvent, faceValue, maxSellPrice])

  // Validate dynamic collar
  useEffect(() => {
    const sPrice = Math.round(parseFloat(startPrice) || 0)
    const rPrice = Math.round(parseFloat(reservePrice) || 0)

    if (maxSellPrice > 0 && sPrice > maxSellPrice) {
      setCollarError(`Starting price cannot exceed the dynamic collar cap of ₹${maxSellPrice}`)
    } else if (sPrice && rPrice && sPrice <= rPrice) {
      setCollarError('Starting price must be strictly greater than reserve floor price')
    } else {
      setCollarError('')
    }
  }, [startPrice, reservePrice, maxSellPrice])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedRelicId) {
      toast.error('Please select an available ticket to auction')
      return
    }
    const numStart = Math.round(parseFloat(startPrice) || 0)
    const numReserve = Math.round(parseFloat(reservePrice) || 0)

    if (isNaN(numStart) || isNaN(numReserve) || numStart <= 0 || numReserve <= 0) {
      toast.error('Please provide valid positive prices')
      return
    }
    if (numStart <= numReserve) {
      toast.error('Starting price must be higher than reserve price')
      return
    }
    if (collarError) {
      toast.error(collarError)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await auctionsApi.createAuction({
        relicId: selectedRelicId,
        eventSymbol: selectedEvent.symbol,
        startPrice: numStart,
        reservePrice: numReserve,
        durationSeconds: durationMinutes * 60,
      })

      if (res?.success) {
        toast.success('🔥 Dutch Auction launched! Price is decaying live.', {
          icon: '⚡',
        })
        onSuccess()
        onClose()
      }
    } catch (err) {
      const msg = err?.message || err?.data?.message || 'Failed to create auction'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const durationPresets = [5, 15, 30, 60]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-lg bg-[#0E0B09]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-6 shadow-[0_30px_90px_rgba(0,0,0,0.98),0_0_50px_rgba(212,175,55,0.08),inset_0_1px_0_rgba(255,255,255,0.15)] text-stone-200 animate-spatial-pop transition-all">
        {/* Subtle Ambient Gold Flare */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-white/[0.08]">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/60 text-[#F5D061] shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-cinzel font-bold text-white tracking-wide">
              Launch Dutch Auction
            </h2>
            <p className="text-xs text-white/50 font-mono">
              Market: {selectedEvent?.name} ({selectedEvent?.symbol})
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoadingRelics ? (
          <div className="py-12 flex flex-col items-center justify-center text-white/40">
            <Loader2 className="w-6 h-6 animate-spin text-[#F5D061] mb-2" />
            <p className="text-xs font-mono">Checking your Vault for available relics...</p>
          </div>
        ) : relics.length === 0 ? (
          <div className="py-8 text-center bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-inner">
            <Ticket className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">No Available Tickets Found</h3>
            <p className="text-xs text-white/50 max-w-xs mx-auto mb-4">
              You do not own any unlocked tickets for <strong>{selectedEvent?.symbol}</strong> to auction.
            </p>
            <p className="text-[11px] text-[#F5D061] font-mono">
              Import a pass using your barcode or purchase one on the secondary order book first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Relic Selection */}
            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5">
                Select Ticket from Your Vault:
              </label>
              <select
                value={selectedRelicId}
                onChange={(e) => setSelectedRelicId(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-[#F5D061] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer"
              >
                {relics.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#14100E] text-white">
                    Ticket ID: {r.external_ticket_id || r.id.substring(0, 8)} (Status: Available)
                  </option>
                ))}
              </select>
            </div>

            {/* Price Inputs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-white/70 mb-1.5">
                  Start Price (₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#D4AF37] font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={startPrice}
                    onChange={(e) => setStartPrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                    placeholder="150"
                    required
                  />
                </div>
                <span className="text-[10px] text-white/40 font-mono mt-1 block">
                  Collar Cap: ₹{maxSellPrice.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/70 mb-1.5">
                  Floor Reserve Price (₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#22C55E] font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs font-mono text-[#22C55E] font-bold focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                    placeholder="80"
                    required
                  />
                </div>
                <span className="text-[10px] text-white/40 font-mono mt-1 block">
                  Minimum price you'll accept
                </span>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-mono text-white/70 mb-1.5">
                Auction Duration:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {durationPresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-1.5 rounded-xl text-xs font-mono transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                      durationMinutes === mins
                        ? 'bg-[#D4AF37]/25 text-[#F5D061] font-bold border border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                        : 'bg-white/[0.03] border border-white/[0.08] text-white/50 hover:text-white hover:border-[#D4AF37]/40'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            {/* Live Decay Preview Card */}
            {parseFloat(startPrice) > parseFloat(reservePrice) && (
              <div className="bg-white/[0.02] border border-[#D4AF37]/25 rounded-2xl p-3.5 text-xs font-mono space-y-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center space-x-1.5 text-[#F5D061] font-semibold mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Decay Rate Preview:</span>
                </div>
                <div className="flex justify-between text-white/50 text-[11px]">
                  <span>Decay speed:</span>
                  <span className="text-white font-bold">
                    ₹{(((parseFloat(startPrice) - parseFloat(reservePrice)) / (durationMinutes * 60))).toFixed(3)} / second
                  </span>
                </div>
                <div className="flex justify-between text-white/50 text-[11px]">
                  <span>Midpoint price ({durationMinutes / 2}m):</span>
                  <span className="text-[#F5D061] font-bold">
                    ₹{Math.round((parseFloat(startPrice) + parseFloat(reservePrice)) / 2).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {collarError && (
              <div className="flex items-center space-x-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{collarError}</span>
              </div>
            )}

            <div className="flex items-start space-x-2 text-[11px] text-white/50 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
              <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>
                Locking your ticket in Dutch Auction escrow makes it available for immediate purchase.
                Active buyers with open orders will receive email notification alerts instantly.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!collarError}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] text-black font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-300 shadow-xl hover:-translate-y-0.5 active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Auction...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 fill-current text-black" />
                  <span>Confirm & Launch Auction</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
