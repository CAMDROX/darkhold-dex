import React, { useState, useEffect } from 'react'
import {
  X,
  Ticket,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { ticketsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ImportTicketModal({ isOpen, onClose, onTicketQueued }) {
  const { user } = useAuth()
  const isKycVerified = (user?.kyc_status || '').toLowerCase() === 'verified'

  // State Management
  const [events, setEvents] = useState([])
  const [isFetchingEvents, setIsFetchingEvents] = useState(false)
  const [selectedEventSymbol, setSelectedEventSymbol] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 1. Fetch Active Events when Modal opens
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setIsFetchingEvents(true)
    setError('')

    ticketsApi.getEvents()
      .then((data) => {
        if (!isMounted) return
        const list = Array.isArray(data) ? data : data.events || []
        setEvents(list)
        if (list.length > 0) {
          setSelectedEventSymbol((prev) => {
            if (prev) return prev
            const defaultEvt = list.find((e) => e.symbol === 'WEBSTER_26') || list[0]
            return defaultEvt.symbol
          })
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('[ImportTicketModal] Error fetching events:', err)
        setError('Failed to fetch active festival events. Please check connection.')
      })
      .finally(() => {
        if (isMounted) setIsFetchingEvents(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Helper to generate sample mock barcode
  const handleGenerateSample = () => {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase()
    const sym = selectedEventSymbol || 'WEBSTER_26'
    setTicketId(`TKT-${sym}-${randomHex}`)
    setError('')
  }

  // 2. HTTP Submission Handler (POST /api/tickets/import)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!selectedEventSymbol) {
      setError('Please select a target festival event.')
      return
    }

    const trimmedTicket = ticketId.trim()
    if (!trimmedTicket) {
      setError('Please enter a valid external ticket barcode.')
      return
    }

    if (!isKycVerified) {
      setError('Verification blocked: Trader account must complete KYC verification before ingesting third-party barcodes.')
      return
    }

    setIsSubmitting(true)
    try {
      const resp = await ticketsApi.importTicket({
        event_symbol: selectedEventSymbol,
        ticket_id: trimmedTicket,
      })

      if (resp && resp.status === 'QUEUED') {
        toast.success(`Import Job Queued (${resp.job_id || 'Asynq'}). Ledger updating asynchronously!`, {
          icon: '⚡',
          duration: 5000,
        })
        setTicketId('')
        onTicketQueued?.(resp)
        onClose()
      } else {
        toast.success('Ticket imported into verification pipeline!')
        setTicketId('')
        onClose()
      }
    } catch (err) {
      console.error('[ImportTicketModal Error]:', err)
      const errorMsg =
        err.data?.error ||
        err.message ||
        'Failed to queue import ticket job. Ensure background workers are healthy.'
      setError(errorMsg)
      toast.error(errorMsg, { duration: 6000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedEvent = events.find((e) => e.symbol === selectedEventSymbol)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
      />

      {/* Modal Dialog (Spatial Popover) */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0E0B09]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_30px_90px_rgba(0,0,0,0.98),0_0_50px_rgba(212,175,55,0.08),inset_0_1px_0_rgba(255,255,255,0.15)] p-6 sm:p-8 z-10 overflow-hidden text-left animate-spatial-pop transition-all">
        {/* Subtle arcane glow overlay */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#EF4444]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/60 flex items-center justify-center text-[#F5D061] shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.03] border border-[#D4AF37]/35 text-[10px] font-mono text-[#D4AF37]">
                <Zap className="w-2.5 h-2.5 animate-pulse text-[#F5D061]" />
                <span>OPEN-LOOP INGESTION · VERIFICATION PIPELINE</span>
              </div>
              <h2 className="font-cinzel font-bold text-xl text-white mt-1 tracking-wide">
                Import Secondary Relic
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#200D0B] border border-[#EF4444]/40 flex items-start gap-2.5 text-xs font-mono text-[#FCA5A5]">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-white mb-0.5">Import Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Event Dropdown */}
          <div>
            <label className="block text-xs font-mono text-white/70 uppercase tracking-wider mb-2">
              1. Select Festival Event
            </label>

            {isFetchingEvents ? (
              <div className="h-11 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center px-4 gap-2 text-xs font-mono text-white/50">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Fetching active market events from /api/events...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedEventSymbol}
                  onChange={(e) => setSelectedEventSymbol(e.target.value)}
                  disabled={isSubmitting || !isKycVerified}
                  className="w-full h-11 px-4 rounded-2xl bg-black/40 border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                >
                  {events.length === 0 ? (
                    <option value="">No active events found</option>
                  ) : (
                    events.map((evt) => (
                      <option
                        key={evt.id || evt.symbol}
                        value={evt.symbol}
                        className="bg-[#14100E] text-white"
                      >
                        {evt.name} ({evt.symbol})
                        {evt.face_value ? ` — Face Value: ₹${evt.face_value}` : ''}
                      </option>
                    ))
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-white/40">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            )}

            {selectedEvent && (
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-white/50 px-1">
                <span>Symbol: <strong className="text-[#D4AF37]">{selectedEvent.symbol}</strong></span>
                {selectedEvent.max_sell_price != null && (
                  <span>Max Collar Ceiling: <strong className="text-[#22C55E]">₹{Number(selectedEvent.max_sell_price || 0).toLocaleString()}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Barcode Text Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-white/70 uppercase tracking-wider">
                2. External Barcode / Ticket ID
              </label>
              <button
                type="button"
                onClick={handleGenerateSample}
                disabled={isSubmitting || !isKycVerified}
                className="text-[11px] font-mono text-[#D4AF37] hover:text-[#F5D061] hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Test Barcode</span>
              </button>
            </div>

            <input
              type="text"
              value={ticketId}
              onChange={(e) => {
                setTicketId(e.target.value)
                setError('')
              }}
              disabled={isSubmitting || !isKycVerified}
              placeholder={isKycVerified ? "e.g. TKT-WEBSTER_26-9A4B" : "Locked: Complete KYC verification to input barcode"}
              className="w-full h-11 px-4 rounded-2xl bg-black/40 border border-white/[0.08] text-white font-mono text-xs placeholder-white/30 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            />
            <p className="text-[11px] font-mono text-white/40 mt-1.5 px-1">
              Submitting triggers an asynchronous Redis Asynq task. You can close this modal immediately while the worker processes the verification in the background.
            </p>
          </div>

          {/* Architecture Explainer Pill */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-white/60 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              On HTTP 202 response, the job executes asynchronously. Upon verification, your vault balance updates via private WebSockets with zero page reload.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isFetchingEvents || events.length === 0}
              className="px-6 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2 text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Queueing Job...</span>
                </>
              ) : (
                <>
                  <span>Import Ticket</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
