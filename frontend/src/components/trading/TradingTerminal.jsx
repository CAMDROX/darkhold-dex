import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Loader2,
  Zap,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWebSocket } from '../../context/WebSocketContext'
import { ordersApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function TradingTerminal({
  selectedEvent,
  availableFiat = 0,
  availableRelics = 0,
  onBalanceRefresh,
}) {
  const { user } = useAuth()
  const { subscribe } = useWebSocket()
  const isKycVerified = (user?.kyc_status || '').toLowerCase() === 'verified'

  // Form State
  const [side, setSide] = useState('BUY') // 'BUY' | 'SELL'
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [collarError, setCollarError] = useState('')

  // Level 2 Order Book State
  const [bids, setBids] = useState([])
  const [asks, setAsks] = useState([])
  const [spread, setSpread] = useState(0)
  const [isLoadingBook, setIsLoadingBook] = useState(false)

  const maxSellPrice = selectedEvent?.max_sell_price || 0
  const faceValue = selectedEvent?.face_value || 0

  // Set default initial price
  useEffect(() => {
    if (selectedEvent?.face_value) {
      setPrice(selectedEvent.face_value.toString())
    }
  }, [selectedEvent])

  // Anti-scalper dynamic price collar validation (< 0.1ms client-side)
  useEffect(() => {
    if (maxSellPrice > 0) {
      const numP = parseFloat(price)
      if (!isNaN(numP) && numP > maxSellPrice) {
        setCollarError(`Price ₹${numP} exceeds dynamic collar cap of ₹${maxSellPrice} (Face value ₹${faceValue})`)
      } else {
        setCollarError('')
      }
    } else {
      setCollarError('')
    }
  }, [price, maxSellPrice, faceValue])

  // 1. Fetch initial L2 Order Book Snapshot via REST
  const fetchOrderBook = useCallback(async () => {
    if (!selectedEvent?.symbol) return
    setIsLoadingBook(true)
    try {
      const depth = await ordersApi.getOrderBook(selectedEvent.symbol)
      if (depth) {
        setBids(depth.bids || [])
        setAsks(depth.asks || [])
        setSpread(depth.spread || 0)
      }
    } catch (err) {
      console.error('[TradingTerminal] Error fetching orderbook:', err)
    } finally {
      setIsLoadingBook(false)
    }
  }, [selectedEvent?.symbol])

  useEffect(() => {
    fetchOrderBook()
  }, [fetchOrderBook])

  // 2. WebSocket Listener for ORDER_BOOK_UPDATE & TRADE_SETTLED
  useEffect(() => {
    // Public Level-2 Order Book Stream
    const handleOrderBookUpdate = (raw) => {
      const data = raw?.data || raw
      const incomingSymbol = (data?.event_symbol || data?.symbol || '').toUpperCase()
      const currentSymbol = (selectedEvent?.symbol || '').toUpperCase()
      if (!incomingSymbol || !currentSymbol || incomingSymbol === currentSymbol) {
        setBids(Array.isArray(data?.bids) ? data.bids : [])
        setAsks(Array.isArray(data?.asks) ? data.asks : [])
        setSpread(data?.spread ?? 0)
      }
    }

    // Private Settlement Notification
    const handleTradeSettled = (data) => {
      console.log('⚡ [TradingTerminal WS] TRADE_SETTLED event received:', data)
      const tradePrice = data?.price || 0
      const tradeQty = data?.quantity || 1
      const isBuyer = data?.buyer_id === user?.id
      const isSeller = data?.seller_id === user?.id

      if (isBuyer || isSeller) {
        toast.success(
          `🎉 Trade Settled! ${isBuyer ? 'Purchased' : 'Sold'} ${tradeQty} ticket(s) @ ₹${tradePrice.toLocaleString()}. Escrow updated!`,
          {
            icon: '🏛️',
            duration: 6000,
          }
        )
      }

      // Refresh wallet balance and order book
      onBalanceRefresh?.()
      fetchOrderBook()
    }

    const unsubBook1 = subscribe('ORDER_BOOK_UPDATE', handleOrderBookUpdate)
    const unsubBook2 = subscribe('ORDERBOOK_DEPTH_UPDATE', handleOrderBookUpdate)
    const unsubSettle = subscribe('TRADE_SETTLED', handleTradeSettled)
    const unsubExec = subscribe('TRADE_EXECUTED', () => {
      fetchOrderBook()
      onBalanceRefresh?.()
    })
    const unsubCancel = subscribe('ORDER_CANCELLED', () => {
      fetchOrderBook()
      onBalanceRefresh?.()
    })
    const unsubMatched = subscribe('ORDER_MATCHED', (data) => {
      toast.success(`⚡ Order Matched! Executing trade for ${data?.event_symbol || 'market'}...`, {
        icon: '🏛️',
        duration: 4000,
      })
      fetchOrderBook()
      onBalanceRefresh?.()
    })
    const unsubResting = subscribe('ORDER_RESTING', () => {
      fetchOrderBook()
    })

    return () => {
      unsubBook1?.()
      unsubBook2?.()
      unsubSettle?.()
      unsubExec?.()
      unsubCancel?.()
      unsubMatched?.()
      unsubResting?.()
    }
  }, [subscribe, selectedEvent, user?.id, onBalanceRefresh, fetchOrderBook])

  // 3. Submit Order to POST /api/orders
  const handleSubmitOrder = async (e) => {
    e.preventDefault()
    if (!selectedEvent) return

    if (!isKycVerified) {
      toast.error('Identity Verification Required: Only KYC-verified traders can execute secondary trades.', {
        icon: '🛡️',
      })
      return
    }

    const numPrice = Math.round(parseFloat(price) || 0)
    const numQty = parseInt(quantity, 10)

    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Please enter a valid limit price')
      return
    }
    if (isNaN(numQty) || numQty <= 0) {
      toast.error('Quantity must be at least 1')
      return
    }

    if (collarError) {
      toast.error('Cannot place order: Price exceeds dynamic price collar cap!')
      return
    }

    setIsSubmitting(true)
    try {
      const resp = await ordersApi.placeOrder({
        eventSymbol: selectedEvent.symbol,
        side,
        orderType: 'LIMIT',
        price: numPrice,
        quantity: numQty,
        quoteCurrency: 'INR',
      })

      if (resp && resp.success) {
        toast.success(
          `Order Placed (HTTP 200 OK): ${side} ${numQty} ticket(s) @ ₹${numPrice.toLocaleString()}`,
          { icon: side === 'BUY' ? '🟢' : '🔴' }
        )
        onBalanceRefresh?.()
        fetchOrderBook()
      }
    } catch (err) {
      console.error('[TradingTerminal] Order error:', err)
      toast.error(err.message || 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate volume proportions for visual depth bars
  const maxQty = Math.max(
    ...bids.map((b) => b.quantity),
    ...asks.map((a) => a.quantity),
    1
  )

  const displayAsks = [...asks].reverse()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Left Panel: Order Placement Form (5 cols) */}
      <div className="lg:col-span-5 rounded-2xl gloss-panel border border-[#2A211B] p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col justify-between">
        <div>
          {/* Side Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B0908] border border-[#201915] mb-5">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-2.5 rounded-lg font-cinzel font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                side === 'BUY'
                  ? 'bg-[#22C55E]/15 border border-[#22C55E] text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                  : 'text-[#8E867A] hover:text-[#C5BEB3] border border-transparent'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
              <span>Buy Ticket</span>
            </button>

            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-2.5 rounded-lg font-cinzel font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                side === 'SELL'
                  ? 'bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'text-[#8E867A] hover:text-[#C5BEB3] border border-transparent'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-[#EF4444]" />
              <span>Sell Ticket</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            {/* Price Field */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-[#B3ABA0]">Limit Price (INR)</span>
                <span className="text-[#8E867A]">
                  Cap: <strong className="text-[#F5D061]">₹{maxSellPrice.toLocaleString()}</strong>
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-[#D4AF37]">
                  ₹
                </span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className={`w-full bg-[#120F0D] border rounded-xl py-2.5 pl-8 pr-4 text-white font-mono text-sm focus:outline-none transition-all ${
                    collarError
                      ? 'border-[#EF4444] text-[#EF4444] focus:ring-1 focus:ring-[#EF4444]'
                      : 'border-[#2A221C] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                  }`}
                />
              </div>

              {collarError && (
                <p className="text-[11px] font-mono text-[#EF4444] mt-1.5 flex items-center gap-1">
                  <span>{collarError}</span>
                </p>
              )}
            </div>

            {/* Quantity Field */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-[#B3ABA0]">Ticket Quantity</span>
                <span className="text-[#8E867A]">
                  {side === 'BUY' ? (
                    <span>Available: ₹{availableFiat.toLocaleString()}</span>
                  ) : (
                    <span>Vault: {availableRelics} pass(es)</span>
                  )}
                </span>
              </div>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full bg-[#120F0D] border border-[#2A221C] rounded-xl py-2.5 px-4 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />

              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuantity(val.toString())}
                    className={`flex-1 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                      parseInt(quantity, 10) === val
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F5D061]'
                        : 'bg-[#14100E] border-[#221B17] text-[#8E867A] hover:border-[#D4AF37]/40'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Escrow Lock Breakdown */}
            <div className="p-3 rounded-xl bg-[#0D0B0A] border border-[#221B16] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[#8E867A]">
                <span>Order Total:</span>
                <span className="text-white font-bold">
                  ₹{(Math.round(parseFloat(price) || 0) * (parseInt(quantity, 10) || 1)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#A8A195] pt-1 border-t border-[#1C1613]">
                <Lock className="w-3 h-3 text-[#D4AF37]" />
                <span>Escrow locked in PostgreSQL until matched via Redis.</span>
              </div>
            </div>

            {/* Submit Button */}
            {!isKycVerified ? (
              <div className="p-3 rounded-xl bg-[#FB923C]/10 border border-[#FB923C]/30 text-center">
                <span className="text-xs font-mono text-[#FB923C] block mb-1 font-semibold flex items-center justify-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> KYC Verification Required
                </span>
                <span className="text-[10px] font-mono text-[#A8A195]">
                  Only verified traders can participate in secondary order matching.
                </span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !!collarError}
                className={`w-full py-3.5 rounded-xl font-cinzel font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  side === 'BUY'
                    ? 'bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#22C55E] hover:to-[#4ADE80] text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    : 'bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Awaiting 200 OK from Engine...</span>
                  </>
                ) : (
                  <>
                    {side === 'BUY' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    <span>Submit {side} Order</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      </div>

      {/* 2. Right Panel: Level 2 Order Book (7 cols) */}
      <div className="lg:col-span-7 rounded-2xl gloss-panel border border-[#2A211B] p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#221B16]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-cinzel font-bold text-sm text-white tracking-wide">
                Level-2 Order Book — {selectedEvent?.symbol || 'L2'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#22C55E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span>ORDER_BOOK_UPDATE (LIVE)</span>
            </div>
          </div>

          {/* Column Titles */}
          <div className="grid grid-cols-4 text-[10px] font-mono text-[#8E867A] uppercase tracking-wider pb-2 px-2 border-b border-[#1A1411]">
            <span>Price (INR)</span>
            <span className="text-right">Size</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Total Depth</span>
          </div>

          {/* ASKS (SELL ORDERS) - Red */}
          <div className="space-y-0.5 py-1 min-h-[140px] flex flex-col justify-end">
            {displayAsks.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-[#6A6357]">
                No resting ask orders on the book
              </div>
            ) : (
              displayAsks.map((ask, idx) => {
                const widthPct = Math.min(100, Math.round((ask.quantity / maxQty) * 100))
                return (
                  <div
                    key={`ask-${ask.price}-${idx}`}
                    onClick={() => setPrice(ask.price.toString())}
                    className="relative grid grid-cols-4 text-xs font-mono py-1 px-2 rounded hover:bg-[#EF4444]/10 cursor-pointer transition-colors group"
                    title="Click to autofill price"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#EF4444]/15 rounded-r pointer-events-none transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="text-[#EF4444] font-semibold relative z-10 group-hover:underline">
                      ₹{ask.price.toLocaleString()}
                    </span>
                    <span className="text-right text-[#E0DBD2] relative z-10">
                      {ask.quantity}
                    </span>
                    <span className="text-right text-[#8E867A] relative z-10">
                      {ask.order_count || 1}
                    </span>
                    <span className="text-right text-[#C0B7A8] text-[11px] relative z-10">
                      ₹{(ask.price * ask.quantity).toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* SPREAD INDICATOR */}
          <div className="my-2 py-2 px-3 rounded-xl bg-[#120E0C] border border-[#261E18] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#D4AF37]">
              <Activity className="w-3.5 h-3.5 text-[#F5D061]" />
              <span className="text-[11px] font-semibold">
                Mid-Market Spread: ₹{spread.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-[#8E867A]">
              Click any price row to autofill your order form
            </span>
          </div>

          {/* BIDS (BUY ORDERS) - Green */}
          <div className="space-y-0.5 py-1 min-h-[140px]">
            {bids.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-[#6A6357]">
                No resting buy bids on the book
              </div>
            ) : (
              bids.map((bid, idx) => {
                const widthPct = Math.min(100, Math.round((bid.quantity / maxQty) * 100))
                return (
                  <div
                    key={`bid-${bid.price}-${idx}`}
                    onClick={() => setPrice(bid.price.toString())}
                    className="relative grid grid-cols-4 text-xs font-mono py-1 px-2 rounded hover:bg-[#22C55E]/10 cursor-pointer transition-colors group"
                    title="Click to autofill price"
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-[#22C55E]/15 rounded-r pointer-events-none transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    />
                    <span className="text-[#22C55E] font-semibold relative z-10 group-hover:underline">
                      ₹{bid.price.toLocaleString()}
                    </span>
                    <span className="text-right text-[#E0DBD2] relative z-10">
                      {bid.quantity}
                    </span>
                    <span className="text-right text-[#8E867A] relative z-10">
                      {bid.order_count || 1}
                    </span>
                    <span className="text-right text-[#C0B7A8] text-[11px] relative z-10">
                      ₹{(bid.price * bid.quantity).toLocaleString()}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#1C1613] flex items-center justify-between text-[10px] font-mono text-[#8E867A]">
          <span className="text-[#22C55E]">● Bids ({bids.length} levels)</span>
          <span className="text-[#EF4444]">● Asks ({asks.length} levels)</span>
        </div>
      </div>
    </div>
  )
}
