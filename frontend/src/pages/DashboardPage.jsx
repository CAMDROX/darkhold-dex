import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import {
  Coins,
  ArrowRight,
  Ticket,
  Wallet,
} from 'lucide-react'
import { ticketsApi, walletApi, ordersApi } from '../services/api'
import MarketHeader from '../components/trading/MarketHeader'
import OrderEntryForm from '../components/trading/OrderEntryForm'
import OrderBookDepth from '../components/trading/OrderBookDepth'
import RecentTradesTape from '../components/trading/RecentTradesTape'
import MyOrdersTable from '../components/trading/MyOrdersTable'
import DutchAuctionFeed from '../components/trading/DutchAuctionFeed'
import SimulatedDepositModal from '../components/SimulatedDepositModal'
import ImportTicketModal from '../components/ImportTicketModal'

export default function DashboardPage() {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()
  const kycStatus = (user?.kyc_status || 'unverified').toLowerCase()
  const isKycVerified = kycStatus === 'verified'

  // Modal States
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Market & Events State
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [_isFetchingEvents, setIsFetchingEvents] = useState(true)

  // Trading Data State
  const [l2Data, setL2Data] = useState({ bids: [], asks: [], spread: 0, best_bid: 0, best_ask: 0 })
  const [trades, setTrades] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [telemetry, setTelemetry] = useState(null)
  const [externalPrice, setExternalPrice] = useState(null)

  // User Balances State
  const [availableFiat, setAvailableFiat] = useState(0)
  const [availableRelics, setAvailableRelics] = useState(0)

  // 1. Fetch Active Events
  const fetchEvents = useCallback(async () => {
    setIsFetchingEvents(true)
    try {
      const data = await ticketsApi.getEvents()
      const list = Array.isArray(data) ? data : data?.events || []
      setEvents(list)
      if (list.length > 0) {
        setSelectedEvent((prev) => {
          if (prev) {
            return list.find((e) => e.symbol === prev.symbol) || list[0]
          }
          return list.find((e) => e.symbol === 'WEBSTER_26') || list[0]
        })
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching events:', err)
    } finally {
      setIsFetchingEvents(false)
    }
  }, [])

  // 2. Fetch User Balances & Inventory
  const fetchUserBalances = useCallback(async () => {
    try {
      const resp = await walletApi.getBalances()
      if (resp && resp.balances) {
        const inrItem = resp.balances.find((b) => b.currency === 'INR' && b.account_type === 'AVAILABLE')
        setAvailableFiat(inrItem ? inrItem.balance : 0)
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching balances:', err)
    }
  }, [])

  const fetchUserRelics = useCallback(async () => {
    if (!selectedEvent) return
    try {
      const resp = await ticketsApi.getMyRelics()
      if (resp && resp.relics) {
        const matchingRelics = resp.relics.filter(
          (r) => r.event_symbol === selectedEvent.symbol && r.status === 'AVAILABLE'
        )
        setAvailableRelics(matchingRelics.length)
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching relics:', err)
    }
  }, [selectedEvent])

  // 3. Fetch L2 Order Book Depth
  const fetchOrderBook = useCallback(async () => {
    if (!selectedEvent) return
    try {
      const depth = await ordersApi.getOrderBook(selectedEvent.symbol)
      if (depth) {
        setL2Data(depth)
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching order book:', err)
    }
  }, [selectedEvent])

  // 4. Fetch Recent Market Trades
  const fetchMarketTrades = useCallback(async () => {
    if (!selectedEvent) return
    try {
      const resp = await ordersApi.getTrades(selectedEvent.symbol)
      if (resp && resp.trades) {
        setTrades(resp.trades)
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching trades:', err)
    }
  }, [selectedEvent])

  // 5. Fetch User's Orders
  const fetchMyOrders = useCallback(async () => {
    try {
      const resp = await ordersApi.getMyOrders()
      if (resp && resp.orders) {
        setMyOrders(resp.orders)
      }
    } catch (err) {
      console.error('[Dashboard] Error fetching my orders:', err)
    }
  }, [])

  // 6. Fetch Telemetry
  const fetchTelemetry = useCallback(async () => {
    try {
      const tel = await ordersApi.getTelemetry()
      if (tel) {
        setTelemetry(tel)
      }
    } catch (err) {
      // quiet fail
    }
  }, [])

  // Initial Load
  useEffect(() => {
    fetchEvents()
    fetchUserBalances()
    fetchMyOrders()
    fetchTelemetry()
  }, [fetchEvents, fetchUserBalances, fetchMyOrders, fetchTelemetry])

  // On Selected Event Change: reload book & trades & inventory
  useEffect(() => {
    if (selectedEvent) {
      fetchOrderBook()
      fetchMarketTrades()
      fetchUserRelics()
    }
  }, [selectedEvent, fetchOrderBook, fetchMarketTrades, fetchUserRelics])

  // 7. Real-Time WebSocket Listeners
  useEffect(() => {
    // A: Real-Time Level 2 Order Book Depth Stream
    const handleOrderBookUpdate = (raw) => {
      const data = raw?.data || raw
      const incomingSymbol = (data?.event_symbol || data?.symbol || '').toUpperCase()
      const currentSymbol = (selectedEvent?.symbol || '').toUpperCase()
      if (!incomingSymbol || !currentSymbol || incomingSymbol === currentSymbol) {
        setL2Data({
          bids: Array.isArray(data?.bids) ? data.bids : [],
          asks: Array.isArray(data?.asks) ? data.asks : [],
          spread: data?.spread ?? 0,
          best_bid: data?.best_bid ?? 0,
          best_ask: data?.best_ask ?? 0,
          ...data,
        })
      }
    }

    // B: Real-Time Trade Execution Stream
    const handleTradeExecuted = (raw) => {
      const data = raw?.data || raw
      const incomingSymbol = (data?.event_symbol || data?.symbol || '').toUpperCase()
      const currentSymbol = (selectedEvent?.symbol || '').toUpperCase()
      if (!incomingSymbol || !currentSymbol || incomingSymbol === currentSymbol) {
        setTrades((prev) => [data, ...prev.slice(0, 49)])
        fetchOrderBook()
        fetchUserBalances()
        fetchUserRelics()
        fetchMyOrders()
      }
    }

    // C: Wallet Deposit Confirmation
    const handleDepositSuccess = () => {
      fetchUserBalances()
    }

    // D: Relic Ingestion Confirmation
    const handleImportSuccess = () => {
      fetchUserRelics()
    }

    // E: Order Lifecycle & Settlement Updates
    const handleOrderChange = () => {
      fetchOrderBook()
      fetchMyOrders()
      fetchUserBalances()
      fetchUserRelics()
    }

    const unsubDepth1 = subscribe('ORDERBOOK_DEPTH_UPDATE', handleOrderBookUpdate)
    const unsubDepth2 = subscribe('ORDER_BOOK_UPDATE', handleOrderBookUpdate)
    const unsubTrade = subscribe('TRADE_EXECUTED', handleTradeExecuted)
    const unsubSettle = subscribe('TRADE_SETTLED', handleOrderChange)
    const unsubMatched = subscribe('ORDER_MATCHED', handleOrderChange)
    const unsubResting = subscribe('ORDER_RESTING', handleOrderChange)
    const unsubPlaced = subscribe('ORDER_PLACED', handleOrderChange)
    const unsubCancelled = subscribe('ORDER_CANCELLED', handleOrderChange)
    const unsubDeposit = subscribe('DEPOSIT_SUCCESS', handleDepositSuccess)
    const unsubImport = subscribe('IMPORT_SUCCESS', handleImportSuccess)

    return () => {
      unsubDepth1?.()
      unsubDepth2?.()
      unsubTrade?.()
      unsubSettle?.()
      unsubMatched?.()
      unsubResting?.()
      unsubPlaced?.()
      unsubCancelled?.()
      unsubDeposit?.()
      unsubImport?.()
    }
  }, [subscribe, selectedEvent, fetchOrderBook, fetchUserBalances, fetchUserRelics, fetchMyOrders])

  // Callbacks after user places or cancels order
  const handleOrderPlaced = () => {
    fetchOrderBook()
    fetchMyOrders()
    fetchUserBalances()
    fetchUserRelics()
  }

  const handleOrderCancelled = () => {
    fetchOrderBook()
    fetchMyOrders()
    fetchUserBalances()
    fetchUserRelics()
  }

  return (
    <div className="min-h-[85vh] py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* 1. Spatial Command Deck: Welcome & Wallet HUD */}
      <div className="relative rounded-3xl spatial-glass p-6 sm:p-7 overflow-hidden shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.06),inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-300">
        {/* Subtle Ambient Gold Flare */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs font-mono text-[#22C55E] shadow-[0_0_12px_rgba(34,197,94,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="font-semibold tracking-wide">LIVE ORDER BOOK · REAL-TIME MATCHING</span>
            </div>
            
            <h1 className="font-cinzel font-black text-2xl sm:text-3xl text-white tracking-wide">
              Secondary Exchange —{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F5D061] to-[#D4AF37]">
                {selectedEvent?.name || 'Festival Market'}
              </span>
            </h1>

            {/* Spatial Wallet HUD Cluster */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs font-mono text-white/50">
                Trader: <strong className="text-white font-mono">{user?.username}</strong>
              </span>
              <span className="text-white/20">|</span>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Wallet className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-white/50 text-xs font-mono">Available Fiat:</span>
                <span className="text-[#22C55E] font-bold font-mono text-xs">₹{(availableFiat || 0).toLocaleString()}</span>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Ticket className="w-3.5 h-3.5 text-[#F5D061]" />
                <span className="text-white/50 text-xs font-mono">Vault Inventory:</span>
                <span className="text-[#F5D061] font-bold font-mono text-xs">{availableRelics || 0} pass(es)</span>
              </div>
            </div>
          </div>

          {/* Quick HUD Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-[#F5D061] bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/45 hover:border-[#D4AF37] transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(212,175,55,0.2)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
            >
              <Coins className="w-3.5 h-3.5 text-[#F5D061]" />
              <span>Deposit INR</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-[#D4AF37]/50 transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95"
            >
              <Ticket className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Import Ticket</span>
            </button>

            <Link
              to="/assets"
              className="px-4 py-2.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold text-white/70 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 flex items-center gap-1.5 hover:-translate-y-0.5 shadow-sm"
            >
              <span>Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Market Selector & Anti-Scalp Collar Telemetry (Level 1 Elevation) */}
      <MarketHeader
        events={events}
        selectedEvent={selectedEvent}
        onSelectEvent={(evt) => setSelectedEvent(evt)}
        spread={l2Data?.spread || 0}
        bestBid={l2Data?.best_bid || 0}
        bestAsk={l2Data?.best_ask || 0}
        telemetry={telemetry}
      />

      {/* 3. Main Trading Terminal Bento Grid (Level 2 Elevation: 3-Column Z-Separation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Order Placement Form */}
        <div className="lg:col-span-4">
          <OrderEntryForm
            selectedEvent={selectedEvent}
            isKycVerified={isKycVerified}
            availableFiat={availableFiat}
            availableRelics={availableRelics}
            onOrderPlaced={handleOrderPlaced}
            onOpenDepositModal={() => setIsDepositModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            externalPrice={externalPrice}
          />
        </div>

        {/* Center Column (5 cols): Level-2 Order Book Depth Ladder */}
        <div className="lg:col-span-5">
          <OrderBookDepth
            l2Data={l2Data}
            isLoading={false}
            onSelectPrice={(price) => setExternalPrice(price)}
          />
        </div>

        {/* Right Column (3 cols): Recent Executed Trades Tape */}
        <div className="lg:col-span-3">
          <RecentTradesTape
            trades={trades}
            isLoading={false}
          />
        </div>
      </div>

      {/* 4. Dutch Auction Liquidation Feed (Level 3 Elevation) */}
      <DutchAuctionFeed
        selectedEvent={selectedEvent}
        onBalanceRefresh={() => {
          fetchUserBalances()
          fetchUserRelics()
        }}
      />

      {/* 5. Bottom Section: Active Trader Orders & Settlement History (Level 4 Elevation) */}
      <MyOrdersTable
        orders={myOrders}
        isLoading={false}
        onOrderCancelled={handleOrderCancelled}
        onRefresh={fetchMyOrders}
      />

      {/* 6. Modals (Spatial Popovers with Z-50 Elevation & Diffuse Shadows) */}
      <SimulatedDepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={() => {
          fetchUserBalances()
          setIsDepositModalOpen(false)
        }}
      />

      <ImportTicketModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onTicketQueued={() => {
          setIsImportModalOpen(false)
        }}
      />
    </div>
  )
}
