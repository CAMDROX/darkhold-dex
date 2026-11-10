import React, { useState } from 'react'
import {
  X,
  CreditCard,
  ShieldCheck,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react'
import { walletApi } from '../services/api'
import { notify } from '../utils/notification'
import ThemedDropdown from './ThemedDropdown'

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

    const numericAmount = Math.round(parseFloat(amount) || 0)
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
          notify.depositSuccess({
            amount: numericAmount,
            currency,
            paymentId: dummyPaymentId,
          })
          if (onSuccess) onSuccess(response)
          handleClose()
        } else {
          const errMsg = response?.error || 'Simulated deposit could not be completed.'
          setErrorMessage(errMsg)
          notify.error('Deposit Failed', errMsg)
          setIsProcessing(false)
          setProcessingStep(0)
        }
      } catch (err) {
        console.error('[SimulatedDepositModal Error]:', err)
        const errMsg =
          err.data?.error || err.message || 'Payment simulation failed. Ensure backend engine is online.'
        setErrorMessage(errMsg)
        notify.error('Deposit Simulation Failed', errMsg)
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
      {/* Dark overlay backdrop with blur */}
      <div
        className="fixed inset-0 bg-[#0F1117]/75 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal Dialog Card (Spatial Popover with Diffuse Shadow) */}
      <div className="relative w-full max-w-lg bg-[#21242E]/98 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden z-10 animate-spatial-pop transition-all">
        {/* Subtle Ambient Gold Flare */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/20 bg-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/60 flex items-center justify-center text-[#F5D061] shadow-[0_0_18px_rgba(212,175,55,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-lg text-white">
                  Add Wallet Funds
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D061]">
                  TESTNET
                </span>
              </div>
              <p className="text-xs font-mono text-white/75">
                Add test funds into your exchange wallet for trading
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* SIMULATED RAZORPAY PROCESSING OVERLAY */}
          {isProcessing ? (
            <div className="py-8 px-4 rounded-2xl bg-white/[0.05] border border-white/20 text-center space-y-5 animate-fade-in shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {/* Razorpay Simulation Header Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1B2B45] border border-[#3B82F6]/40 text-xs font-mono text-[#60A5FA] shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="font-bold">PAYMENT GATEWAY (TEST MODE)</span>
              </div>

              {/* Central Spinner & Graphics */}
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
                <div className="w-14 h-14 rounded-full bg-[#262936] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[#F5D061]" />
                </div>
              </div>

              {/* Status Message */}
              <div className="space-y-1">
                <h4 className="font-sans font-bold text-lg text-white">
                  {processingStep === 1
                    ? 'Razorpay Processing...'
                    : 'Committing Double-Entry Ledger...'}
                </h4>
                <p className="text-xs font-mono text-white/75">
                  {processingStep === 1
                    ? 'Simulating 3D-Secure payment authorization handshake'
                    : 'Recording balance conservation entries in PostgreSQL'}
                </p>
              </div>

              {/* Generated Dummy Payment ID Badge */}
              <div className="max-w-xs mx-auto p-3.5 rounded-xl bg-[#181B24] border border-white/20 text-left font-mono text-xs space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-white/75">
                  <span>DUMMY PAYMENT ID:</span>
                  <span className="text-[#22C55E] flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3" /> Validated
                  </span>
                </div>
                <div className="text-[#F5D061] font-bold truncate">
                  {simulatedPaymentId || 'pay_sim_...'}
                </div>
                <div className="flex items-center justify-between text-white/75 pt-1.5 border-t border-white/20 text-[11px]">
                  <span>AMOUNT:</span>
                  <span className="text-white font-bold">
                    {currency === 'INR' ? '₹' : '$'}
                    {parseFloat(amount || '0').toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-white/75">
                <Lock className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Simulated PCI-DSS 256-Bit SSL Handshake</span>
              </div>
            </div>
          ) : (
            /* STANDARD FORM INPUT VIEW */
            <form onSubmit={handleDepositSubmit} className="space-y-5">
              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-[#341A1D] border border-[#EF4444]/40 text-xs font-mono text-[#FCA5A5] flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Currency Selector & Amount Input */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-white/75">
                  Select Currency & Deposit Amount
                </label>
                <div className="flex rounded-2xl bg-[#181B24] border border-white/20 focus-within:border-[#D4AF37] focus-within:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  {/* Currency Select */}
                  <div className="border-r border-white/20 bg-white/[0.05] flex items-stretch">
                    <ThemedDropdown
                      variant="embedded"
                      ariaLabel="Select Deposit Currency"
                      value={currency}
                      onChange={setCurrency}
                      minMenuWidth={180}
                      className="h-full"
                      options={[
                        { value: 'INR', label: 'INR (₹)', badge: 'India' },
                        { value: 'USD', label: 'USD ($)', badge: 'Global' },
                      ]}
                    />
                  </div>

                  {/* Amount Input */}
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                    className="flex-1 px-4 py-3 bg-transparent text-white font-mono text-base font-bold placeholder-white/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Preset Quick-Pills with Tactile Elevation */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-white/75 block">
                  Quick Amount Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {presets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all duration-200 cursor-pointer ${
                        amount === val.toString()
                          ? 'bg-[#D4AF37]/25 border-[#D4AF37] text-[#F5D061] font-bold shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                          : 'bg-white/[0.06] border-white/20 text-white/70 hover:text-white hover:border-[#D4AF37]/40'
                      }`}
                    >
                      {currency === 'INR' ? `₹${val.toLocaleString()}` : `$${val.toLocaleString()}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Architecture Explanation Box */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/20 space-y-2 text-xs font-mono text-white/75">
                <div className="flex items-center justify-between text-white font-bold">
                  <span className="flex items-center gap-1.5 text-[#D4AF37]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Razorpay Sandbox Simulation</span>
                  </span>
                  <span className="text-[10px] text-[#22C55E]">STRICT IDEMPOTENCY</span>
                </div>
                <p className="leading-relaxed text-[11px] text-white/75">
                  When you click <strong>Deposit</strong>, a client-side Razorpay loading state is simulated. An idempotent dummy reference ID is dispatched to the Go backend, which updates your exchange wallet balance atomically.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold text-[#111318] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
              >
                <Zap className="w-4 h-4 text-[#111318]" />
                <span>
                  Deposit {currency === 'INR' ? '₹' : '$'}
                  {parseFloat(amount || '0').toLocaleString()} {currency}
                </span>
                <ArrowRight className="w-4 h-4 text-[#111318]" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
