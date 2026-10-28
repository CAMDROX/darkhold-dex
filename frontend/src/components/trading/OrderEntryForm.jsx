import React, { useState, useEffect } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Wallet,
  Ticket,
  AlertTriangle,
  Loader2,
  Plus,
  Coins,
  Sparkles,
} from 'lucide-react'
import { ordersApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function OrderEntryForm({
  selectedEvent,
  isKycVerified,
  availableFiat,
  availableRelics,
  onOrderPlaced,
  onOpenDepositModal,
  onOpenImportModal,
  externalPrice, // Optional price clicked from L2 orderbook
}) {
  const [side, setSide] = useState('BUY') // 'BUY' | 'SELL'
  const [orderType, setOrderType] = useState('LIMIT') // 'LIMIT' | 'MARKET'
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [collarError, setCollarError] = useState('')

  const maxSellPrice = selectedEvent?.max_sell_price || 0
  const faceValue = selectedEvent?.face_value || 0

  // Whenever external price is clicked from the orderbook, populate it
  useEffect(() => {
    if (externalPrice && orderType === 'LIMIT') {
      setPrice(externalPrice.toString())
    }
  }, [externalPrice, orderType])

  // Set default initial price if empty
  useEffect(() => {
    if (!price && selectedEvent?.face_value) {
      setPrice(selectedEvent.face_value.toString())
    }
  }, [selectedEvent])

  // Real-time dynamic anti-scalper collar check
  useEffect(() => {
    if (orderType === 'LIMIT' && maxSellPrice > 0) {
      const numPrice = Math.round(parseFloat(price) || 0)
      if (!isNaN(numPrice) && numPrice > maxSellPrice) {
        setCollarError(
          `Collar Ceiling Breach: Price cannot exceed ₹${maxSellPrice.toLocaleString()} (Face value ₹${faceValue.toLocaleString()} + Dynamic Markup)`
        )
      } else {
        setCollarError('')
      }
    } else {
      setCollarError('')
    }
  }, [price, orderType, maxSellPrice, faceValue])

  const numPrice = Math.round(parseFloat(price) || 0)
  const numQty = parseInt(quantity, 10) || 0
  const totalAmount = orderType === 'LIMIT' ? numPrice * numQty : maxSellPrice * numQty

  const isBuy = side === 'BUY'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedEvent) return

    if (!isKycVerified) {
      toast.error('Identity Verification Required: Only KYC-verified traders can execute secondary trades.', {
        icon: '🛡️',
      })
      return
    }

    if (numQty <= 0) {
      toast.error('Quantity must be at least 1 ticket')
      return
    }

    if (orderType === 'LIMIT' && (numPrice <= 0 || isNaN(numPrice))) {
      toast.error('Please enter a valid positive price')
      return
    }

    if (collarError) {
      toast.error('Cannot place order: Price exceeds anti-scalper collar ceiling!')
      return
    }

    // Client-side balance check for instant feedback
    if (isBuy && availableFiat < totalAmount) {
      toast.error(`Insufficient Available Balance: You need ₹${totalAmount.toLocaleString()} but have ₹${availableFiat.toLocaleString()}`)
      return
    }

    if (!isBuy && availableRelics < numQty) {
      toast.error(`Insufficient Ticket Inventory: You hold ${availableRelics} ticket(s) for ${selectedEvent.symbol}, but attempted to sell ${numQty}`)
      return
    }

    setIsSubmitting(true)
    try {
      const resp = await ordersApi.placeOrder({
        eventSymbol: selectedEvent.symbol,
        side,
        orderType,
        price: orderType === 'LIMIT' ? numPrice : maxSellPrice,
        quantity: numQty,
        quoteCurrency: 'INR',
      })

      if (resp && resp.success) {
        toast.success(
          `Order Placed: ${side} ${numQty} ticket(s) @ ₹${(orderType === 'LIMIT' ? numPrice : maxSellPrice).toLocaleString()}`,
          { icon: isBuy ? '🟢' : '🔴' }
        )
        if (resp.trades && resp.trades.length > 0) {
          toast.success(`⚡ Matched! ${resp.trades.length} trade(s) executed atomically with zero-sum settlement!`, {
            icon: '🏛️',
            duration: 6000,
          })
        }
        onOrderPlaced?.(resp)
      }
    } catch (err) {
      console.error('[Order Placement Error]:', err)
      const errorMsg = err.message || err.error || 'Failed to place order'
      toast.error(errorMsg, { duration: 6000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl gloss-panel border border-[#2A211B] p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.7)] flex flex-col justify-between">
      <div>
        {/* Top Header: Buy / Sell Side Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B0908] border border-[#201915] mb-5">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2.5 rounded-lg font-cinzel font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isBuy
                ? 'bg-[#22C55E]/15 border border-[#22C55E] text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : 'text-[#8E867A] hover:text-[#C5BEB3] border border-transparent'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
            <span>Buy Relic</span>
          </button>

          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2.5 rounded-lg font-cinzel font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isBuy
                ? 'bg-[#EF4444]/15 border border-[#EF4444] text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'text-[#8E867A] hover:text-[#C5BEB3] border border-transparent'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-[#EF4444]" />
            <span>Sell Relic</span>
          </button>
        </div>

        {/* Order Type Selector: LIMIT vs MARKET */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-[#9E9689]">
            Order Execution Type
          </span>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0F0D0B] border border-[#251D18]">
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`px-3 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                orderType === 'LIMIT'
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061]'
                  : 'text-[#8E867A] hover:text-white'
              }`}
            >
              LIMIT
            </button>
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`px-3 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                orderType === 'MARKET'
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061]'
                  : 'text-[#8E867A] hover:text-white'
              }`}
            >
              MARKET
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? maxSellPrice : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={orderType === 'MARKET' ? 'Best Available Market Price' : 'Enter limit price'}
                className={`w-full bg-[#120F0D] border rounded-xl py-2.5 pl-8 pr-4 text-white font-mono text-sm focus:outline-none transition-all ${
                  collarError
                    ? 'border-[#EF4444] text-[#EF4444] focus:ring-1 focus:ring-[#EF4444]'
                    : 'border-[#2A221C] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                } ${orderType === 'MARKET' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {collarError && (
              <p className="text-[11px] font-mono text-[#EF4444] mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{collarError}</span>
              </p>
            )}
          </div>

          {/* Quantity Field */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-[#B3ABA0]">Ticket Quantity</span>
              <span className="text-[#8E867A]">
                {isBuy ? (
                  <span>Need: ₹{totalAmount.toLocaleString()}</span>
                ) : (
                  <span>Available: {availableRelics} pass(es)</span>
                )}
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full bg-[#120F0D] border border-[#2A221C] rounded-xl py-2.5 px-4 text-white font-mono text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
              />
            </div>

            {/* Quick Quantity Chips */}
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
              {!isBuy && availableRelics > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(availableRelics.toString())}
                  className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#F5D061] hover:bg-[#D4AF37]/25 transition-all cursor-pointer"
                >
                  MAX ({availableRelics})
                </button>
              )}
            </div>
          </div>

          {/* Live Balance Row & Quick Actions */}
          <div className="p-3 rounded-xl bg-[#0D0B0A] border border-[#221B16] space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#8E867A]">
              <span>Available {isBuy ? 'Fiat' : 'Inventory'}:</span>
              <div className="flex items-center gap-2">
                {isBuy ? (
                  <span className="text-white font-bold">₹{availableFiat.toLocaleString()}</span>
                ) : (
                  <span className="text-white font-bold">{availableRelics} Relic(s)</span>
                )}
                {isBuy ? (
                  <button
                    type="button"
                    onClick={onOpenDepositModal}
                    className="inline-flex items-center gap-1 text-[10px] text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Deposit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenImportModal}
                    className="inline-flex items-center gap-1 text-[10px] text-[#D4AF37] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Import
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#1C1613] pt-2 text-[#C5BEB3]">
              <span className="font-semibold">Estimated Escrow Lock:</span>
              <span className={`font-bold text-sm ${isBuy ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {isBuy ? `₹${totalAmount.toLocaleString()}` : `${numQty} Ticket(s)`}
              </span>
            </div>
          </div>

          {/* Atomic Escrow Security Note */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#14100E] border border-[#2A211B] text-[11px] font-mono text-[#8E867A]">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              Pre-trade escrow locks assets in zero-sum ledger. Funds release atomically upon match & QR rotation.
            </span>
          </div>

          {/* Submit Order Button */}
          {!isKycVerified ? (
            <div className="p-3 rounded-xl bg-[#FB923C]/10 border border-[#FB923C]/30 text-center">
              <span className="text-xs font-mono text-[#FB923C] block mb-1 flex items-center justify-center gap-1.5 font-semibold">
                <ShieldAlert className="w-4 h-4" /> Identity Verification Required
              </span>
              <span className="text-[10px] font-mono text-[#A8A195]">
                Only KYC-verified traders are allowed to place secondary orders. Complete KYC in the compliance portal.
              </span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !!collarError}
              className={`w-full py-3.5 rounded-xl font-cinzel font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isBuy
                  ? 'bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#22C55E] hover:to-[#4ADE80] text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                  : 'bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Routing to In-Memory Engine...</span>
                </>
              ) : (
                <>
                  {isBuy ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>Place {side} {orderType} Order</span>
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
