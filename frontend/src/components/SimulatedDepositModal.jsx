import React, { useState } from 'react'
import {
  X,
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react'
import { walletApi } from '../services/api'
import toast from 'react-hot-toast'

export default function SimulatedDepositModal({ isOpen, onClose, onSuccess }) {
  const [amount, setAmount] = useState('1000')
  const [currency, setCurrency] = useState('INR')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0) // 0: idle, 1: razorpay gateway, 2: backend ledger commit
  const [simulatedPaymentId, setSimulatedPaymentId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  // Generate simulated Razorpay Payment ID: pay_sim_ + alphanumeric string
  const generateDummyPaymentId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let randomStr = ''
    for (let i = 0; i < 14; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `pay_sim_${randomStr}`
  }

  // Quick preset pills depending on chosen currency
  const presets = currency === 'INR' ? [500, 1000, 5000, 10000, 25000] : [25, 50, 100, 250, 500]

  const handleDepositSubmit = async (e) => {
    e?.preventDefault()
    setErrorMessage('')

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid deposit amount greater than 0.')
      return
    }

    // Generate dummy payment ID
    const dummyPaymentId = generateDummyPaymentId()
    setSimulatedPaymentId(dummyPaymentId)

    // 1. Enter simulated "Razorpay Processing" state
    setIsProcessing(true)
    setProcessingStep(1)

    // Simulate 1.5 seconds Razorpay gateway processing delay
    setTimeout(async () => {
      try {
        setProcessingStep(2)

        // 2. Send payload to Go backend
        const response = await walletApi.simulateDeposit(
          numericAmount,
          currency,
          dummyPaymentId
        )

        // 3. On HTTP 200 OK: close modal, allow WebSocket DEPOSIT_SUCCESS to handle live UI update
        if (response && response.success) {
          toast.success(
            `Simulated deposit of ${currency === 'INR' ? '₹' : '$'}${numericAmount.toLocaleString()} initiated!`,
            {
              icon: '💳',
              duration: 4000,
            }
          )
          if (onSuccess) onSuccess(response)
          handleClose()
        } else {
          setErrorMessage(response?.error || 'Simulated deposit could not be completed.')
          setIsProcessing(false)
          setProcessingStep(0)
        }
      } catch (err) {
        console.error('[SimulatedDepositModal Error]:', err)
        setErrorMessage(
          err.data?.error || err.message || 'Payment simulation failed. Ensure backend engine is online.'
        )
        setIsProcessing(false)
        setProcessingStep(0)
      }
    }, 1500)
  }

  const handleClose = () => {
    if (isProcessing) return // Prevent accidental close while simulating
    setErrorMessage('')
    setIsProcessing(false)
    setProcessingStep(0)
    setSimulatedPaymentId('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-[#060504]/85 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-[#0E0B09] border border-[#D4AF37]/40 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden z-10 transition-all">
        {/* Subtle Ambient Gold Flare */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#241E1A] bg-[#14100E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2A211B] to-[#120E0C] border border-[#D4AF37]/60 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cinzel font-bold text-lg text-white">
                  Simulated Fiat On-Ramp
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D061]">
                  TESTNET
                </span>
              </div>
              <p className="text-xs font-mono text-[#8E867A]">
                Deposit fiat test funds into sovereign double-entry ledger
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#8E867A] hover:text-white hover:bg-[#1E1916] transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* SIMULATED RAZORPAY PROCESSING OVERLAY */}
          {isProcessing ? (
            <div className="py-8 px-4 rounded-xl bg-[#090706] border border-[#3A2D25] text-center space-y-5 animate-fade-in">
              {/* Razorpay Simulation Header Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0C1A30] border border-[#3B82F6]/40 text-xs font-mono text-[#60A5FA]">
                <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
                <span className="font-bold">RAZORPAY GATEWAY SIMULATOR</span>
              </div>

              {/* Central Spinner & Graphics */}
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
                <div className="w-14 h-14 rounded-full bg-[#181310] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[#F5D061]" />
                </div>
              </div>

              {/* Status Message */}
              <div className="space-y-1">
                <h4 className="font-cinzel font-bold text-lg text-white">
                  {processingStep === 1
                    ? 'Razorpay Processing...'
                    : 'Committing Double-Entry Ledger...'}
                </h4>
                <p className="text-xs font-mono text-[#A8A195]">
                  {processingStep === 1
                    ? 'Simulating 3D-Secure payment authorization handshake'
                    : 'Recording balance conservation entries in PostgreSQL'}
                </p>
              </div>

              {/* Generated Dummy Payment ID Badge */}
              <div className="max-w-xs mx-auto p-3 rounded-lg bg-[#14100E] border border-[#2A211B] text-left font-mono text-xs space-y-1">
                <div className="flex items-center justify-between text-[#8E867A]">
                  <span>DUMMY PAYMENT ID:</span>
                  <span className="text-[#22C55E] flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3" /> Validated
                  </span>
                </div>
                <div className="text-[#F5D061] font-bold truncate">
                  {simulatedPaymentId || 'pay_sim_...'}
                </div>
                <div className="flex items-center justify-between text-[#8E867A] pt-1 border-t border-[#221B16] text-[11px]">
                  <span>AMOUNT:</span>
                  <span className="text-white font-bold">
                    {currency === 'INR' ? '₹' : '$'}
                    {parseFloat(amount || '0').toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#6E645A]">
                <Lock className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Simulated PCI-DSS 256-Bit SSL Handshake</span>
              </div>
            </div>
          ) : (
            /* STANDARD FORM INPUT VIEW */
            <form onSubmit={handleDepositSubmit} className="space-y-5">
              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-[#291010] border border-[#EF4444]/40 text-xs font-mono text-[#FCA5A5] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Currency Selector & Amount Input */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A8A195]">
                  Select Currency & Deposit Amount
                </label>
                <div className="flex rounded-xl bg-[#090706] border border-[#3E2F26] focus-within:border-[#D4AF37] focus-within:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all overflow-hidden">
                  {/* Currency Select */}
                  <div className="relative border-r border-[#2A211B] bg-[#14100E]">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="h-full px-4 py-3 bg-transparent text-white font-mono font-bold text-sm focus:outline-none cursor-pointer appearance-none pr-8"
                    >
                      <option value="INR" className="bg-[#14100E] text-white">
                        INR (₹)
                      </option>
                      <option value="USD" className="bg-[#14100E] text-white">
                        USD ($)
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#D4AF37]">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    className="flex-1 px-4 py-3 bg-transparent text-white font-mono text-base font-bold placeholder-[#5A5046] focus:outline-none"
                  />
                </div>
              </div>

              {/* Preset Quick-Pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-[#8E867A] block">
                  Quick Amount Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {presets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                        amount === val.toString()
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F5D061] font-bold shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                          : 'bg-[#14100E] border-[#2A211B] text-[#A8A195] hover:text-white hover:border-[#D4AF37]/40'
                      }`}
                    >
                      {currency === 'INR' ? `₹${val.toLocaleString()}` : `$${val.toLocaleString()}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Architecture Explanation Box */}
              <div className="p-3.5 rounded-xl bg-[#14100E] border border-[#261E1A] space-y-2 text-xs font-mono text-[#8E867A]">
                <div className="flex items-center justify-between text-white font-bold">
                  <span className="flex items-center gap-1.5 text-[#D4AF37]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Razorpay Sandbox Simulation</span>
                  </span>
                  <span className="text-[10px] text-[#22C55E]">STRICT IDEMPOTENCY</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  When you click <strong>Deposit</strong>, a client-side Razorpay loading state is simulated. An idempotent dummy reference ID is dispatched to the Go backend, which updates your sovereign ledger account atomically.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
              >
                <Zap className="w-4 h-4 text-[#0B0908]" />
                <span>
                  Deposit {currency === 'INR' ? '₹' : '$'}
                  {parseFloat(amount || '0').toLocaleString()} {currency}
                </span>
                <ArrowRight className="w-4 h-4 text-[#0B0908]" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
