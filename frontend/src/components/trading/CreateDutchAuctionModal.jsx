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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#14100E] border border-amber-900/60 rounded-2xl p-6 shadow-2xl text-stone-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5 pb-4 border-b border-amber-950/60">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-amber-200">
              Launch Dutch Auction
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              Market: {selectedEvent?.name} ({selectedEvent?.symbol})
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoadingRelics ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
            <p className="text-xs font-mono">Checking your Vault for available relics...</p>
          </div>
        ) : relics.length === 0 ? (
          <div className="py-8 text-center bg-stone-950/60 border border-stone-900 rounded-xl p-6">
            <Ticket className="w-10 h-10 text-stone-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-200 mb-1">No Available Tickets Found</h3>
            <p className="text-xs text-stone-400 max-w-xs mx-auto mb-4">
              You do not own any unlocked tickets for <strong>{selectedEvent?.symbol}</strong> to auction.
            </p>
            <p className="text-[11px] text-amber-400 font-mono">
              Import a pass using your barcode or purchase one on the secondary order book first.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Relic Selection */}
            <div>
              <label className="block text-xs font-mono text-stone-300 mb-1.5">
                Select Ticket from Your Vault:
              </label>
              <select
                value={selectedRelicId}
                onChange={(e) => setSelectedRelicId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-amber-200 focus:outline-hidden focus:border-amber-500"
              >
                {relics.map((r) => (
                  <option key={r.id} value={r.id}>
                    Ticket ID: {r.external_ticket_id || r.id.substring(0, 8)} (Status: Available)
                  </option>
                ))}
              </select>
            </div>

            {/* Price Inputs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1.5">
                  Start Price (₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={startPrice}
                    onChange={(e) => setStartPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-amber-200 focus:outline-hidden focus:border-amber-500"
                    placeholder="150"
                    required
                  />
                </div>
                <span className="text-[10px] text-stone-500 font-mono mt-1 block">
                  Collar Cap: ₹{maxSellPrice}
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-stone-300 mb-1.5">
                  Floor Reserve Price (₹):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-500 font-mono text-xs">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
                    placeholder="80"
                    required
                  />
                </div>
                <span className="text-[10px] text-stone-500 font-mono mt-1 block">
                  Minimum price you'll accept
                </span>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-xs font-mono text-stone-300 mb-1.5">
                Auction Duration:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {durationPresets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      durationMinutes === mins
                        ? 'bg-amber-500 text-stone-950 font-bold border border-amber-400'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            </div>

            {/* Live Decay Preview Card */}
            {parseFloat(startPrice) > parseFloat(reservePrice) && (
              <div className="bg-stone-950/80 border border-amber-950/70 rounded-xl p-3 text-xs font-mono space-y-1.5">
                <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Decay Rate Preview:</span>
                </div>
                <div className="flex justify-between text-stone-400 text-[11px]">
                  <span>Decay speed:</span>
                  <span className="text-stone-200 font-bold">
                    ₹{(((parseFloat(startPrice) - parseFloat(reservePrice)) / (durationMinutes * 60))).toFixed(3)} / second
                  </span>
                </div>
                <div className="flex justify-between text-stone-400 text-[11px]">
                  <span>Midpoint price ({durationMinutes / 2}m):</span>
                  <span className="text-amber-300">
                    ₹{Math.round((parseFloat(startPrice) + parseFloat(reservePrice)) / 2).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {collarError && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{collarError}</span>
              </div>
            )}

            <div className="flex items-start space-x-2 text-[11px] text-stone-400 bg-stone-950/40 p-2.5 rounded-lg border border-stone-900">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Locking your ticket in Dutch Auction escrow makes it available for immediate purchase.
                Active buyers with open orders will receive email notification alerts instantly.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!collarError}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Auction...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 fill-current" />
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

