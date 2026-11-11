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
import { notify } from '../utils/notification'
import ThemedDropdown from './ThemedDropdown'

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
      const resp = await ticketsApi.importTicket(trimmedTicket, selectedEventSymbol)

      if (resp && resp.status === 'QUEUED') {
        notify.ticketImportQueued({
          ticketId: trimmedTicket,
          eventSymbol: selectedEventSymbol,
          jobId: resp.job_id,
        })
        setTicketId('')
        onTicketQueued?.(resp)
        onClose()
      } else {
        notify.ticketMinted({
          eventSymbol: selectedEventSymbol,
          ticketId: trimmedTicket,
        })
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
      notify.error('Ticket Ingestion Failed', errorMsg)
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
        className="fixed inset-0 bg-[#0F1117]/75 backdrop-blur-md transition-opacity duration-300"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
      />

      {/* Modal Dialog (Spatial Popover) */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#21242E]/98 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/50 p-6 sm:p-8 z-10 overflow-hidden text-left animate-spatial-pop transition-all">
        {/* Subtle arcane glow overlay */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#EF4444]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between pb-5 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/60 flex items-center justify-center text-[#F5D061] shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-[#D4AF37]/35 text-[10px] font-mono text-[#D4AF37]">
                <Zap className="w-2.5 h-2.5 text-[#F5D061]" />
                <span>TICKET VERIFICATION PIPELINE</span>
              </div>
              <h2 className="font-sans font-bold text-xl text-white mt-1 tracking-wide">
                Import External Ticket
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-white/75 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-[#341A1D] border border-[#EF4444]/40 flex items-start gap-2.5 text-xs font-mono text-[#FCA5A5]">
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
              <div className="h-11 rounded-2xl bg-[#181B24] border border-white/20 flex items-center px-4 gap-2 text-xs font-mono text-white/75">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Fetching active market events from /api/events...</span>
              </div>
            ) : (
              <ThemedDropdown
                ariaLabel="Select Festival Event"
                value={selectedEventSymbol}
                onChange={setSelectedEventSymbol}
                disabled={isSubmitting || !isKycVerified || events.length === 0}
                placeholder="No active events found"
                buttonClassName="h-11"
                options={events.map((evt) => ({
                  value: evt.symbol,
                  label: `${evt.name} (${evt.symbol})`,
                  badge: evt.face_value ? `Face ₹${evt.face_value}` : undefined,
                }))}
              />
            )}

            {selectedEvent && (
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-white/75 px-1">
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
              className="w-full h-11 px-4 rounded-2xl bg-[#181B24] border border-white/20 text-white font-mono text-xs placeholder-white/50 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
            />
            <p className="text-[11px] font-mono text-white/75 mt-1.5 px-1">
              Your barcode will be verified in the background. You can close this window right after submitting — your ticket will appear in your vault automatically.
            </p>
          </div>

          {/* Architecture Explainer Pill */}
          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/20 text-[11px] font-mono text-white/75 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>
              Verified tickets receive a fresh tamper-proof QR payload and can be traded or held safely in your account.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider text-white/75 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isFetchingEvents || events.length === 0}
              className="px-6 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2 text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
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
