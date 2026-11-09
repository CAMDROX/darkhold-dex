import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import {
  Wallet,
  Coins,
  Ticket,
  Plus,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react'
import { walletApi, ticketsApi } from '../services/api'
import SimulatedDepositModal from '../components/SimulatedDepositModal'
import ImportTicketModal from '../components/ImportTicketModal'
import toast from 'react-hot-toast'

export default function AssetsPage() {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()

  // Modal States
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isImportTicketModalOpen, setIsImportTicketModalOpen] = useState(false)

  // Wallet Balances State
  const [balances, setBalances] = useState([
    { currency: 'INR', account_type: 'AVAILABLE', balance: 0.0 },
    { currency: 'USD', account_type: 'AVAILABLE', balance: 0.0 },
  ])
  const [isLoadingBalances, setIsLoadingBalances] = useState(true)

  // Relic Inventory State
  const [relics, setRelics] = useState([])
  const [isLoadingRelics, setIsLoadingRelics] = useState(true)
  const [copiedHash, setCopiedHash] = useState('')

  // 1. Fetch Wallet Balances from GET /api/wallet/balances
  const fetchBalances = useCallback(async () => {
    setIsLoadingBalances(true)
    try {
      const resp = await walletApi.getBalances()
      if (resp && resp.balances) {
        setBalances(resp.balances)
      }
    } catch (err) {
      console.error('[AssetsPage] Error fetching balances:', err)
    } finally {
      setIsLoadingBalances(false)
    }
  }, [])

  // 2. Fetch User Relics from GET /api/tickets/mine
  const fetchMyRelics = useCallback(async () => {
    setIsLoadingRelics(true)
    try {
      const resp = await ticketsApi.getMyRelics()
      if (resp && resp.relics) {
        setRelics(resp.relics)
      }
    } catch (err) {
      console.error('[AssetsPage] Error fetching relics:', err)
    } finally {
      setIsLoadingRelics(false)
    }
  }, [])

  useEffect(() => {
    fetchBalances()
    fetchMyRelics()
  }, [fetchBalances, fetchMyRelics])

  // 3. WebSocket Real-Time Listeners for Wallet & Ticket Events
  useEffect(() => {
    // When Go backend commits fiat deposit and publishes DEPOSIT_SUCCESS
    const handleDepositSuccess = (data) => {
      console.log('⚡ [AssetsPage WS] DEPOSIT_SUCCESS received:', data)
      const currency = data?.currency || 'INR'
      const amount = data?.amount || 0
      const formattedAmount = currency === 'INR' ? `₹${Number(amount).toLocaleString()}` : `$${Number(amount).toLocaleString()}`

      toast.success(`🎉 Deposit Credited! ${formattedAmount} added to your sovereign wallet.`, {
        icon: '💰',
        duration: 5000,
      })

      fetchBalances()
    }

    // When Redis Asynq verification worker mints ticket and publishes IMPORT_SUCCESS
    const handleTicketSuccess = (data) => {
      console.log('⚡ [AssetsPage WS] IMPORT_SUCCESS received:', data)
      const eventSymbol = data?.event_symbol || 'Festival Pass'

      toast.success(`🎫 Ticket Verified & Minted! 1 ${eventSymbol} Relic added to your physical inventory.`, {
        icon: '🛡️',
        duration: 6000,
      })

      fetchMyRelics()
    }

    const handleTicketFailure = (data) => {
      console.error('❌ [AssetsPage WS] Ticket Ingestion Rejected:', data)
      const reason = data?.error || data?.reason || 'Barcode verification failed at external provider.'
      toast.error(`Ticket Verification Failed: ${reason}`, { duration: 6000 })
    }

    const unsubDeposit = subscribe('DEPOSIT_SUCCESS', handleDepositSuccess)
    const unsubTicket1 = subscribe('IMPORT_SUCCESS', handleTicketSuccess)
    const unsubTicket2 = subscribe('TICKET_IMPORTED', handleTicketSuccess)
    const unsubFail1 = subscribe('IMPORT_FAILED', handleTicketFailure)
    const unsubFail2 = subscribe('TICKET_IMPORT_FAILED', handleTicketFailure)

    return () => {
      unsubDeposit?.()
      unsubTicket1?.()
      unsubTicket2?.()
      unsubFail1?.()
      unsubFail2?.()
    }
  }, [subscribe, fetchBalances, fetchMyRelics])

  // Copy QR hash helper
  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    toast.success('Internal QR Hash copied to clipboard!', {
      icon: '📋',
      duration: 2500,
    })
    setTimeout(() => setCopiedHash(''), 2500)
  }

  // Get specific currency balance helper
  const getBalance = (curr) => {
    const item = balances.find((b) => b.currency === curr && b.account_type === 'AVAILABLE')
    return item ? item.balance : 0.0
  }

  const inrBalance = getBalance('INR')
  const usdBalance = getBalance('USD')

  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-7 animate-fade-in">
      
      {/* Spatial Page Header with Dual Action Buttons */}
      <div className="relative rounded-3xl spatial-glass p-6 sm:p-8 border border-white/[0.08] overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061] mb-3 shadow-[0_0_12px_rgba(212,175,55,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
              <span className="font-semibold tracking-wide">SOVEREIGN ASSET TREASURY · DOUBLE-ENTRY ESCROW</span>
            </div>
            <h1 className="font-cinzel font-black text-3xl sm:text-4xl text-white tracking-wide">
              Trader Assets & Vault
            </h1>
            <p className="text-sm font-mono text-white/50 mt-1.5 max-w-xl">
              Deposit simulated fiat funds (USD/INR) via Razorpay sandbox or import external ticket barcodes into your physical relic inventory.
            </p>
          </div>

          {/* THE TWO CORE USER ACTIONS (Tactile Hover Elevate) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Action 1: Deposit Fiat Money */}
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-5 py-3 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold text-black bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all duration-300 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              <Coins className="w-4 h-4 text-black" />
              <span>Deposit Fiat Money</span>
              <Plus className="w-3.5 h-3.5 text-black" />
            </button>

            {/* Action 2: Import Ticket Barcode */}
            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="px-5 py-3 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#D4AF37]/60 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 shadow-md"
            >
              <Ticket className="w-4 h-4 text-[#F5D061]" />
              <span>Import Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: FIAT WALLET & SOVEREIGN BALANCES              */}
      {/* ======================================================== */}
      <div className="rounded-3xl spatial-glass p-6 sm:p-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-6 transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#221B16] to-[#0D0B0A] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-xl text-white flex items-center gap-2.5 tracking-wide">
                <span>Fiat Currency Wallet</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/40 text-[10px] font-mono text-[#22C55E] font-semibold">
                  CONSERVED DOUBLE-ENTRY
                </span>
              </h2>
              <p className="text-xs font-mono text-white/50 mt-0.5">
                Live balance calculated via SQL aggregation on immutable public.ledger_entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchBalances}
              disabled={isLoadingBalances}
              className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all duration-200 cursor-pointer hover:scale-105"
              title="Refresh Wallet Balances"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin text-[#D4AF37]' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-4 py-2 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#D4AF37]/15 border border-[#D4AF37]/45 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simulate Deposit</span>
            </button>
          </div>
        </div>

        {/* Fiat Balance Cards Grid (Floating Bento Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* INR Account Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#140F0C] to-[#0A0807] border border-white/[0.08] hover:border-[#D4AF37]/50 transition-all duration-300 space-y-4 group overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-1 hover:scale-[1.01]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#221B16] to-[#120E0C] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] font-bold text-sm shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  ₹
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-white tracking-wide">Indian Rupee (INR)</h3>
                  <span className="text-[10px] font-mono text-white/40 tracking-wider">AVAILABLE TRADING BALANCE</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-sm text-[#F5D061]">₹</span>
                <span className="font-mono font-black text-3xl sm:text-4xl text-white tracking-tight">
                  {Math.round(inrBalance).toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono text-white/40 ml-1">INR</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">ACCOUNT TYPE:</span>
              <span className="text-[#D4AF37] font-bold">AVAILABLE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-white/[0.03] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 shadow-sm"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Deposit INR via Razorpay Simulation</span>
            </button>
          </div>

          {/* USD Account Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#0F141C] to-[#080B10] border border-white/[0.08] hover:border-[#3B82F6]/50 transition-all duration-300 space-y-4 group overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-1 hover:scale-[1.01]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#3B82F6]/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#121E30] to-[#0A101A] border border-[#3B82F6]/50 flex items-center justify-center text-[#60A5FA] font-bold text-sm shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  $
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-white tracking-wide">United States Dollar (USD)</h3>
                  <span className="text-[10px] font-mono text-white/40 tracking-wider">AVAILABLE TRADING BALANCE</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-sm text-[#60A5FA]">$</span>
                <span className="font-mono font-black text-3xl sm:text-4xl text-white tracking-tight">
                  {Math.round(usdBalance).toLocaleString('en-US')}
                </span>
                <span className="text-xs font-mono text-white/40 ml-1">USD</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
              <span className="text-white/40">ACCOUNT TYPE:</span>
              <span className="text-[#3B82F6] font-bold">AVAILABLE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#60A5FA] bg-white/[0.03] border border-[#3B82F6]/40 hover:bg-[#3B82F6]/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 shadow-sm"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Deposit USD via Razorpay Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: RELIC INVENTORY VAULT (TICKETS)               */}
      {/* ======================================================== */}
      <div className="rounded-3xl spatial-glass p-6 sm:p-8 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-6 transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#221B16] to-[#0D0B0A] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-xl text-white flex items-center gap-2.5 tracking-wide">
                <span>Relic Inventory Vault</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-mono text-[#F5D061]">
                  {relics.length} {relics.length === 1 ? 'RELIC' : 'RELICS'}
                </span>
              </h2>
              <p className="text-xs font-mono text-white/50 mt-0.5">
                Double-entry physical ticket relics verified & minted via open-loop Asynq pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchMyRelics}
              disabled={isLoadingRelics}
              className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-all duration-200 cursor-pointer hover:scale-105"
              title="Refresh Inventory"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingRelics ? 'animate-spin text-[#D4AF37]' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="px-4 py-2 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#D4AF37]/15 border border-[#D4AF37]/45 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Barcode</span>
            </button>
          </div>
        </div>

        {/* Minted Relic Cards List */}
        {isLoadingRelics && relics.length === 0 ? (
          <div className="py-12 text-center space-y-3 font-mono text-xs text-white/40">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto" />
            <p>Syncing physical vault ledger entries...</p>
          </div>
        ) : relics.length === 0 ? (
          <div className="py-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.08] mx-auto flex items-center justify-center text-white/30 shadow-inner">
              <Ticket className="w-7 h-7" />
            </div>
            <h3 className="font-cinzel font-bold text-lg text-white">
              No Secondary Relics in Vault Yet
            </h3>
            <p className="text-xs font-mono text-white/50 leading-relaxed">
              Import an external festival barcode (e.g. from Webster Hall 2026 or Sunburn Goa) to test the asynchronous verification worker and mint your first physical relic.
            </p>
            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:-translate-y-0.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Import Your First Ticket</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {relics.map((relic) => (
              <div
                key={relic.id}
                className="relative rounded-2xl p-5 bg-white/[0.02] border border-white/[0.08] hover:border-[#D4AF37]/50 transition-all duration-300 space-y-3.5 group overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-1 hover:scale-[1.01]"
              >
                {/* Corner accent glow */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent pointer-events-none" />

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block font-semibold">
                      {relic.event_symbol || 'EVENT RELIC'}
                    </span>
                    <h4 className="font-cinzel font-bold text-base text-white group-hover:text-[#F5D061] transition-colors">
                      {relic.event_name || relic.event_symbol}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/40 text-[10px] font-mono text-[#22C55E] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{relic.status}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-white/50">
                    <span>EXTERNAL BARCODE:</span>
                    <span className="text-white font-bold">{relic.external_ticket_id}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white/40 text-[10px] block">INTERNAL QR HASH (SHA-256):</span>
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/[0.06] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                      <span className="text-[11px] text-white/80 font-mono truncate max-w-[200px]" title={relic.internal_qr_hash}>
                        {relic.internal_qr_hash ? `${relic.internal_qr_hash.slice(0, 16)}...${relic.internal_qr_hash.slice(-8)}` : 'Generating...'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(relic.internal_qr_hash)}
                        className="text-[#D4AF37] hover:text-[#F5D061] p-1 rounded transition-colors cursor-pointer"
                        title="Copy full hash"
                      >
                        {copiedHash === relic.internal_qr_hash ? (
                          <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                    <span>MINTED:</span>
                    <span>{new Date(relic.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulated Deposit Modal */}
      <SimulatedDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={fetchBalances}
      />

      {/* Import Ticket Modal */}
      <ImportTicketModal
        isOpen={isImportTicketModalOpen}
        onClose={() => setIsImportTicketModalOpen(false)}
        onTicketQueued={fetchMyRelics}
      />
    </div>
  )
}
