import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
  Lock,
  Copy,
  Check,
  QrCode,
  DollarSign,
  IndianRupee,
  Layers,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { walletApi, ticketsApi } from '../services/api'
import SimulatedDepositModal from '../components/SimulatedDepositModal'
import ImportTicketModal from '../components/ImportTicketModal'
import toast from 'react-hot-toast'

export default function AssetsPage() {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()
  const kycStatus = (user?.kyc_status || 'unverified').toLowerCase()
  const isKycVerified = kycStatus === 'verified'

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

      // Refetch balances immediately
      fetchBalances()
    }

    // When Asynq ticket worker completes verification
    const handleTicketSuccess = (data) => {
      console.log('⚡ [AssetsPage WS] Relic successfully verified and minted:', data)
      const ticketId = data?.ticket_id
      toast.success(
        data?.message || `🎉 Relic ${ticketId || ''} verified and minted into your vault!`,
        {
          icon: '🎟️',
          duration: 5000,
        }
      )
      fetchMyRelics()
    }

    const handleTicketFailure = (data) => {
      console.warn('⚠️ [AssetsPage WS] Relic verification failed:', data)
      const reason = data?.message || data?.reason || 'Verification rejected by organizer'
      toast.error(`Verification Failed: ${reason}`, {
        icon: '⚠️',
        duration: 6000,
      })
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
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Page Header with Dual Action Buttons */}
      <div className="relative rounded-2xl gloss-panel p-6 sm:p-8 border border-[#D4AF37]/30 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181412] border border-[#D4AF37]/40 text-xs font-mono text-[#F5D061] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>SOVEREIGN ASSET TREASURY // DOUBLE-ENTRY LEDGER</span>
            </div>
            <h1 className="font-cinzel font-black text-3xl sm:text-4xl text-white">
              Trader Assets & Vault
            </h1>
            <p className="text-sm font-mono text-[#9E9689] mt-1.5 max-w-xl">
              Deposit simulated fiat funds (USD/INR) via Razorpay sandbox or import external ticket barcodes into your physical relic inventory.
            </p>
          </div>

          {/* THE TWO CORE USER ACTIONS */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Action 1: Deposit Fiat Money */}
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-5 py-3 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-[#0B0908] bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
            >
              <Coins className="w-4 h-4 text-[#0B0908]" />
              <span>Deposit Fiat Money</span>
              <Plus className="w-3.5 h-3.5 text-[#0B0908]" />
            </button>

            {/* Action 2: Import Ticket Barcode */}
            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="px-5 py-3 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 cursor-pointer text-white bg-[#1C1613] border border-[#D4AF37]/60 hover:bg-[#251D18] hover:border-[#D4AF37]"
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
      <div className="rounded-2xl gloss-panel p-6 sm:p-8 border border-[#2A231F] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#241E1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#221B16] to-[#0D0B0A] border border-[#D4AF37]/50 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.25)]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-xl text-white flex items-center gap-2.5">
                <span>Fiat Currency Wallet</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#18261A] border border-[#22C55E]/40 text-[10px] font-mono text-[#22C55E]">
                  CONSERVED DOUBLE-ENTRY
                </span>
              </h2>
              <p className="text-xs font-mono text-[#9E9689]">
                Live balance calculated via SQL aggregation on immutable public.ledger_entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchBalances}
              disabled={isLoadingBalances}
              className="p-2 rounded-xl text-[#A8A195] hover:text-[#D4AF37] hover:bg-[#1C1714] border border-[#2A231F] transition-all cursor-pointer"
              title="Refresh Wallet Balances"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingBalances ? 'animate-spin text-[#D4AF37]' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-3.5 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-[#D4AF37] bg-[#1C1714] border border-[#D4AF37]/50 hover:bg-[#251E1A] hover:border-[#D4AF37] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simulate Deposit</span>
            </button>
          </div>
        </div>

        {/* Fiat Balance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* INR Account Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#120E0C] to-[#0A0807] border border-[#3A2D25] hover:border-[#D4AF37]/50 transition-all space-y-4 group overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1F1712] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-white">Indian Rupee (INR)</h3>
                  <span className="text-[10px] font-mono text-[#8E867A]">AVAILABLE TRADING BALANCE</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18261A] border border-[#22C55E]/40 text-[#22C55E] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs text-[#F5D061]">₹</span>
                <span className="font-mono font-black text-3xl sm:text-4xl text-white tracking-tight">
                  {Math.round(inrBalance).toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono text-[#8E867A] ml-1">INR</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#221B16] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8E867A]">ACCOUNT TYPE:</span>
              <span className="text-[#D4AF37] font-bold">AVAILABLE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#1C1613] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>Deposit INR via Razorpay Simulation</span>
            </button>
          </div>

          {/* USD Account Card */}
          <div className="relative rounded-2xl p-6 bg-gradient-to-br from-[#120E0C] to-[#0A0807] border border-[#3A2D25] hover:border-[#D4AF37]/50 transition-all space-y-4 group overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#3B82F6]/10 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#141B26] border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA] font-bold">
                  $
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-base text-white">United States Dollar (USD)</h3>
                  <span className="text-[10px] font-mono text-[#8E867A]">AVAILABLE TRADING BALANCE</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18261A] border border-[#22C55E]/40 text-[#22C55E] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-xs text-[#60A5FA]">$</span>
                <span className="font-mono font-black text-3xl sm:text-4xl text-white tracking-tight">
                  {Math.round(usdBalance).toLocaleString('en-US')}
                </span>
                <span className="text-xs font-mono text-[#8E867A] ml-1">USD</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#221B16] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8E867A]">ACCOUNT TYPE:</span>
              <span className="text-[#D4AF37] font-bold">AVAILABLE</span>
            </div>

            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="w-full py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold text-[#60A5FA] bg-[#121924] border border-[#3B82F6]/40 hover:bg-[#3B82F6]/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
      <div className="rounded-2xl gloss-panel p-6 sm:p-8 border border-[#2A231F] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#241E1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14100E] border border-[#D4AF37]/40 flex items-center justify-center text-[#F5D061] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-xl text-white flex items-center gap-2">
                <span>Relic Inventory Vault</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#181412] border border-[#D4AF37]/40 text-xs font-mono text-[#D4AF37]">
                  {relics.length} {relics.length === 1 ? 'RELIC' : 'RELICS'}
                </span>
              </h2>
              <p className="text-xs font-mono text-[#9E9689]">
                Double-entry physical ticket relics verified & minted via open-loop Asynq pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchMyRelics}
              disabled={isLoadingRelics}
              className="p-2 rounded-xl text-[#A8A195] hover:text-[#D4AF37] hover:bg-[#1C1714] border border-[#2A231F] transition-all cursor-pointer"
              title="Refresh Inventory"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoadingRelics ? 'animate-spin text-[#D4AF37]' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider font-bold text-[#D4AF37] bg-[#1C1714] border border-[#D4AF37]/50 hover:bg-[#251E1A] hover:border-[#D4AF37] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Barcode</span>
            </button>
          </div>
        </div>

        {/* Minted Relic Cards List */}
        {isLoadingRelics && relics.length === 0 ? (
          <div className="py-12 text-center space-y-3 font-mono text-xs text-[#8C8477]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto" />
            <p>Syncing physical vault ledger entries...</p>
          </div>
        ) : relics.length === 0 ? (
          <div className="py-12 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#14100E] border border-[#2A231F] mx-auto flex items-center justify-center text-[#6B6357]">
              <Ticket className="w-7 h-7" />
            </div>
            <h3 className="font-cinzel font-bold text-lg text-white">
              No Secondary Relics in Vault Yet
            </h3>
            <p className="text-xs font-mono text-[#9E9689] leading-relaxed">
              Import an external festival barcode (e.g. from Webster Hall 2026 or Sunburn Goa) to test the asynchronous verification worker and mint your first physical relic.
            </p>
            <button
              type="button"
              onClick={() => setIsImportTicketModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer text-[#0B0908] bg-gradient-to-r from-[#D4AF37] to-[#F5D061] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            >
              <Plus className="w-4 h-4" />
              <span>Import Your First Ticket</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {relics.map((relic) => (
              <div
                key={relic.id}
                className="relative rounded-xl p-5 bg-[#0D0B0A] border border-[#2A231F] hover:border-[#D4AF37]/40 transition-all space-y-3 group overflow-hidden"
              >
                {/* Corner accent glow */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#D4AF37]/10 to-transparent pointer-events-none" />

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block">
                      {relic.event_symbol || 'EVENT RELIC'}
                    </span>
                    <h4 className="font-cinzel font-bold text-base text-white group-hover:text-[#F5D061] transition-colors">
                      {relic.event_name || relic.event_symbol}
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#18261A] border border-[#22C55E]/40 text-[10px] font-mono text-[#22C55E]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{relic.status}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-[#1C1714] space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#8C8477]">
                    <span>EXTERNAL BARCODE:</span>
                    <span className="text-white font-bold">{relic.external_ticket_id}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#8C8477] text-[10px] block">INTERNAL QR HASH (SHA-256):</span>
                    <div className="flex items-center justify-between bg-[#14100E] p-2 rounded-lg border border-[#201A16]">
                      <span className="text-[11px] text-[#C5BBAE] font-mono truncate max-w-[200px]" title={relic.internal_qr_hash}>
                        {relic.internal_qr_hash ? `${relic.internal_qr_hash.slice(0, 16)}...${relic.internal_qr_hash.slice(-8)}` : 'Generating...'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyHash(relic.internal_qr_hash)}
                        className="text-[#D4AF37] hover:text-white p-1 rounded transition-colors cursor-pointer"
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

                  <div className="flex items-center justify-between text-[11px] text-[#6E6659] pt-1">
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
