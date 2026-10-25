import React, { useState, useEffect } from 'react'
import {
  X,
  Ticket,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowUpRight,
  Zap,
} from 'lucide-react'
import { ticketsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ImportTicketModal({ isOpen, onClose, onTicketQueued }) {
  const { user } = useAuth()
  const isKycVerified = (user?.kyc_status || '').toLowerCase() === 'verified'
  const isKycPending = (user?.kyc_status || '').toLowerCase() === 'pending'
  const kycStatusDisplay = (user?.kyc_status || 'unverified').toUpperCase()

  // State Management
  const [events, setEvents] = useState([])
  const [isFetchingEvents, setIsFetchingEvents] = useState(false)
  const [selectedEventSymbol, setSelectedEventSymbol] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleNavigateToKyc = () => {
    onClose()
    setTimeout(() => {
      const kycSection = document.getElementById('kyc-verification-section')
      if (kycSection) {
        kycSection.scrollIntoView({ behavior: 'smooth' })
      }
    }, 100)
  }

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

    setIsSubmitting(true)

    try {
      const resp = await ticketsApi.importTicket(trimmedTicket, selectedEventSymbol)

      // HTTP 202 Accepted: Verification queued
      toast.success(resp?.message || 'Verification queued', {
        icon: '📨',
        duration: 4000,
      })

      if (onTicketQueued) {
        onTicketQueued()
      }

      setIsSubmitting(false)
      setTicketId('')
      onClose()
    } catch (err) {
      // HTTP 400 Bad Request (duplicate ticket or invalid input)
      setIsSubmitting(false)
      const errorMsg =
        err.data?.error ||
        err.message ||
        'Failed to import ticket. Please ensure the barcode is unique.'
      setError(errorMsg)
    }
  }

  if (!isOpen) return null

  const selectedEvent = events.find((e) => e.symbol === selectedEventSymbol)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-[#060504]/80 backdrop-blur-md transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0E0C0A]/95 border border-[#D4AF37]/40 shadow-[0_0_50px_rgba(212,175,55,0.18)] p-6 sm:p-8 z-10 overflow-hidden text-left">
        {/* Subtle arcane glow overlay */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#EF4444]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between pb-5 border-b border-[#2A231F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#171310] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#181412] border border-[#D4AF37]/30 text-[10px] font-mono text-[#D4AF37]">
                <Zap className="w-2.5 h-2.5 animate-pulse" />
                <span>OPEN-LOOP INGESTION // ASYNQ</span>
              </div>
              <h2 className="font-cinzel font-bold text-xl text-white mt-1">
                Import Secondary Relic
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#8C8477] hover:text-white hover:bg-[#1E1916] transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-[#200D0B] border border-[#EF4444]/40 flex items-start gap-2.5 text-xs font-mono text-[#FCA5A5]">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-white mb-0.5">Import Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}



          {/* Event Dropdown */}
          <div>
            <label className="block text-xs font-mono text-[#C5BBAE] uppercase tracking-wider mb-2">
              1. Select Festival Event
            </label>

            {isFetchingEvents ? (
              <div className="h-11 rounded-xl bg-[#14100E] border border-[#2C241E] flex items-center px-4 gap-2 text-xs font-mono text-[#8C8477]">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Fetching active market events from /api/events...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedEventSymbol}
                  onChange={(e) => setSelectedEventSymbol(e.target.value)}
                  disabled={isSubmitting || !isKycVerified}
                  className="w-full h-11 px-4 rounded-xl bg-[#14100E] border border-[#2C241E] text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#A8A195]">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
            )}

            {selectedEvent && (
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#8C8477] px-1">
                <span>Symbol: <strong className="text-[#D4AF37]">{selectedEvent.symbol}</strong></span>
                {selectedEvent.max_sell_price && (
                  <span>Max Collar Ceiling: <strong className="text-[#22C55E]">₹{selectedEvent.max_sell_price}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Barcode Text Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-[#C5BBAE] uppercase tracking-wider">
                2. External Barcode / Ticket ID
              </label>
              <button
                type="button"
                onClick={handleGenerateSample}
                disabled={isSubmitting || !isKycVerified}
                className="text-[11px] font-mono text-[#D4AF37] hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full h-11 px-4 rounded-xl bg-[#14100E] border border-[#2C241E] text-white font-mono text-xs placeholder-[#5A5248] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-[11px] font-mono text-[#7E766B] mt-1.5 px-1">
              Submitting triggers an asynchronous Redis Asynq task. You can close this modal immediately while the worker processes the verification in the background.
            </p>
          </div>

          {/* Architecture Explainer Pill */}
          <div className="p-3 rounded-xl bg-[#120E0C] border border-[#241E1A] text-[11px] font-mono text-[#A8A195] flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              On HTTP 202 response, the job executes asynchronously. Upon verification, your vault balance updates via private WebSockets with zero page reload.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A231F]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-[#A8A195] hover:text-white hover:bg-[#1A1512] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isFetchingEvents || events.length === 0}
              className="px-6 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 text-[#0B0908] bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Queueing Job...</span>
                </>
              ) : (
                <>
                  <span>Import Ticket</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
