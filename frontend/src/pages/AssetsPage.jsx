import React, { useState, useEffect, useCallback } from 'react'
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
import { notify } from '../utils/notification'

export default function AssetsPage() {
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

      notify.depositSuccess({
        amount,
        currency,
      })

      fetchBalances()
    }

    // When Redis Asynq verification worker mints ticket and publishes IMPORT_SUCCESS
    const handleTicketSuccess = (data) => {
      console.log('⚡ [AssetsPage WS] IMPORT_SUCCESS received:', data)
      const eventSymbol = data?.event_symbol || 'Festival Pass'

      notify.ticketMinted({
        eventSymbol,
        ticketId: data?.ticket_id,
      })

      fetchMyRelics()
    }

    const handleTicketFailure = (data) => {
      console.error('❌ [AssetsPage WS] Ticket Ingestion Rejected:', data)
      const reason = data?.error || data?.reason || 'Barcode verification failed at external provider.'
      notify.error('Ticket Verification Rejected', reason)
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
    notify.info('QR Hash Copied', 'Internal cryptographic ticket QR payload copied to clipboard.')
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
      <div className="relative rounded-3xl spatial-glass p-6 sm:p-8 border border-white/20 overflow-hidden shadow-lg shadow-black/40 transition-all duration-300">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs font-mono text-[#F5D061] mb-3 shadow-[0_0_12px_rgba(212,175,55,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
              <span className="font-semibold tracking-wide">WALLET & TICKET VAULT</span>
            </div>
            <h1 className="font-sans font-black text-3xl sm:text-4xl text-white tracking-wide">
              Trader Assets & Vault
            </h1>
            <p className="text-sm font-mono text-white/75 mt-1.5 max-w-xl">
              Add test funds (INR/USD) to your trading wallet or import an external event ticket barcode into your verified vault.
            </p>
          </div>

          {/* THE TWO CORE USER ACTIONS (Tactile Hover Elevate) */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Action 1: Deposit Fiat Money */}
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-5 py-3 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold text-black bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Coins className="w-4 h-4 text-black" />
              <span>Deposit Fiat Money</span>
              <Plus className="w-3.5 h-3.5 text-black" />
            </button>

            {/* Action 2: Import Ticket Barcode */}
            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="px-5 py-3 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer text-white bg-white/[0.07] hover:bg-white/[0.14] border border-white/20 hover:border-[#D4AF37]/60 shadow-md"
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
      <div className="rounded-3xl spatial-glass p-6 sm:p-8 shadow-lg shadow-black/40 space-y-6 transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-xl text-white flex items-center gap-2.5 tracking-wide">
                <span>Fiat Currency Wallet</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/40 text-[10px] font-mono text-[#22C55E] font-semibold">
                  CONSERVED DOUBLE-ENTRY
                </span>
              </h2>
              <p className="text-xs font-mono text-white/75 mt-0.5">
                Live balance calculated via SQL aggregation on immutable public.ledger_entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchBalances}
              disabled={isLoadingBalances}
              className="p-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/[0.08] border border-white/20 transition-all duration-200 cursor-pointer"
              title="Refresh Wallet Balances"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin text-[#D4AF37]' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-4 py-2 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#D4AF37]/15 border border-[#D4AF37]/45 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simulate Deposit</span>
            </button>
          </div>
        </div>

        {/* Fiat Balance Cards Grid (Floating Bento Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* INR Account Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#222632] to-[#1D202A] border border-white/20 hover:border-[#D4AF37]/50 transition-all duration-300 space-y-4 group overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] font-bold text-sm shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  ₹
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-white tracking-wide">Indian Rupee (INR)</h3>
                  <span className="text-[10px] font-mono text-white/75 tracking-wider">AVAILABLE TRADING BALANCE</span>
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
                <span className="text-xs font-mono text-white/75 ml-1">INR</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs font-mono">
              <span className="text-white/75">ACCOUNT TYPE:</span>
              <span className="text-[#D4AF37] font-bold">AVAILABLE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-white/[0.06] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Deposit INR via Razorpay Simulation</span>
            </button>
          </div>

          {/* USD Account Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#1F2534] to-[#1A202D] border border-white/20 hover:border-[#3B82F6]/50 transition-all duration-300 space-y-4 group overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#3B82F6]/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22314A] to-[#1B263B] border border-[#3B82F6]/50 flex items-center justify-center text-[#60A5FA] font-bold text-sm shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  $
                </div>
                <div>
                  <h3 className="font-sans font-bold text-base text-white tracking-wide">United States Dollar (USD)</h3>
                  <span className="text-[10px] font-mono text-white/75 tracking-wider">AVAILABLE TRADING BALANCE</span>
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
                <span className="text-xs font-mono text-white/75 ml-1">USD</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs font-mono">
              <span className="text-white/75">ACCOUNT TYPE:</span>
              <span className="text-[#3B82F6] font-bold">AVAILABLE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#60A5FA] bg-white/[0.06] border border-[#3B82F6]/40 hover:bg-[#3B82F6]/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Deposit USD via Razorpay Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: TICKET INVENTORY VAULT (TICKETS)               */}
      {/* ======================================================== */}
      <div className="rounded-3xl spatial-glass p-6 sm:p-8 shadow-lg shadow-black/40 space-y-6 transition-all duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2A2E3B] to-[#212530] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-xl text-white flex items-center gap-2.5 tracking-wide">
                <span>My Verified Tickets</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-mono text-[#F5D061]">
                  {relics.length} {relics.length === 1 ? 'TICKET' : 'TICKETS'}
                </span>
              </h2>
              <p className="text-xs font-mono text-white/75 mt-0.5">
                Verified event tickets protected with dynamic QR codes and double-entry ownership tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchMyRelics}
              disabled={isLoadingRelics}
              className="p-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/[0.08] border border-white/20 transition-all duration-200 cursor-pointer"
              title="Refresh Inventory"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingRelics ? 'animate-spin text-[#D4AF37]' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="px-4 py-2 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#D4AF37]/15 border border-[#D4AF37]/45 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Barcode</span>
            </button>
          </div>
        </div>

        {/* Minted Relic Cards List */}
        {isLoadingRelics && relics.length === 0 ? (
          <div className="py-12 text-center space-y-3 font-mono text-xs text-white/75">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto" />
            <p>Syncing physical vault ledger entries...</p>
          </div>
        ) : relics.length === 0 ? (
          <div className="py-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/20 mx-auto flex items-center justify-center text-white/75 shadow-inner">
              <Ticket className="w-7 h-7" />
            </div>
            <h3 className="font-sans font-bold text-lg text-white">
              No Tickets in Vault Yet
            </h3>
            <p className="text-xs font-mono text-white/75 leading-relaxed">
              Import an existing festival ticket barcode to verify ownership and list or hold it securely in your account.
            </p>
            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer text-black bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] shadow-md"
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
                className="relative rounded-2xl p-5 bg-white/[0.05] border border-white/20 hover:border-[#D4AF37]/50 transition-all duration-300 space-y-3.5 group overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                {/* Corner accent glow */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent pointer-events-none" />

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block font-semibold">
                      {relic.event_symbol || 'EVENT TICKET'}
                    </span>
                    <h4 className="font-sans font-bold text-base text-white group-hover:text-[#F5D061] transition-colors">
                      {relic.event_name || relic.event_symbol}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/40 text-[10px] font-mono text-[#22C55E] font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{relic.status}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-white/20 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-white/75">
                    <span>EXTERNAL BARCODE:</span>
                    <span className="text-white font-bold">{relic.external_ticket_id}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-white/75 text-[10px] block">INTERNAL QR HASH (SHA-256):</span>
                    <div className="flex items-center justify-between bg-[#181B24] p-2.5 rounded-xl border border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
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

                  <div className="flex items-center justify-between text-[11px] text-white/75 pt-1">
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
