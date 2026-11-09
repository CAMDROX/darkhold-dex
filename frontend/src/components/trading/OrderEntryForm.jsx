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
import { notify } from '../../utils/notification'

export default function OrderEntryForm({
  selectedEvent,
  isKycVerified,
  availableFiat = 0,
  availableRelics = 0,
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
      notify.error('Identity Verification Required', 'Please complete identity verification (KYC) in your Profile before placing orders.')
      return
    }

    if (numQty <= 0) {
      notify.warning('Invalid Order Quantity', 'Quantity must be at least 1 ticket pass.')
      return
    }

    if (orderType === 'LIMIT' && (numPrice <= 0 || isNaN(numPrice))) {
      notify.warning('Invalid Limit Price', 'Please enter a valid positive numeric limit price.')
      return
    }

    if (collarError) {
      notify.error('Anti-Scalper Collar Breach', collarError)
      return
    }

    // Client-side balance check for instant feedback
    if (isBuy && availableFiat < totalAmount) {
      notify.error(
        'Insufficient Fiat Balance',
        `Required: ₹${(totalAmount || 0).toLocaleString()} INR · Available: ₹${(availableFiat || 0).toLocaleString()} INR. Deposit funds to proceed.`
      )
      return
    }

    if (!isBuy && availableRelics < numQty) {
      notify.error(
        'Insufficient Ticket Inventory',
        `You hold ${availableRelics || 0} pass(es) for ${selectedEvent?.symbol || 'market'}, but attempted to sell ${numQty}. Import tickets to proceed.`
      )
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
        const executionPrice = orderType === 'LIMIT' ? numPrice : maxSellPrice
        const hasMatched = Boolean(resp.trades && resp.trades.length > 0)

        if (isBuy) {
          notify.buyOrder({
            symbol: selectedEvent.symbol,
            price: executionPrice,
            quantity: numQty,
            isMatched: hasMatched,
            tradesCount: resp.trades?.length || 0,
          })
        } else {
          notify.sellOrder({
            symbol: selectedEvent.symbol,
            price: executionPrice,
            quantity: numQty,
            isMatched: hasMatched,
            tradesCount: resp.trades?.length || 0,
          })
        }

        onOrderPlaced?.(resp)
      }
    } catch (err) {
      console.error('[Order Placement Error]:', err)
      const errorMsg = err.message || err.error || 'Failed to place order'
      notify.error('Order Submission Rejected', errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full h-full rounded-3xl spatial-glass p-5 sm:p-6 shadow-lg shadow-black/40 flex flex-col justify-between transition-all duration-300">
      <div className="flex flex-col flex-1">
        {/* Top Header: Buy / Sell Side Selector (Floating Recessed Tray) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#181B24] border border-white/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] mb-5">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              isBuy
                ? 'bg-gradient-to-r from-[#22C55E]/20 to-[#22C55E]/10 border border-[#22C55E]/70 text-[#22C55E] shadow-[0_0_20px_rgba(34,197,94,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'text-white/75 hover:text-white/80 hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" />
            <span>Buy Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
              !isBuy
                ? 'bg-gradient-to-r from-[#EF4444]/20 to-[#EF4444]/10 border border-[#EF4444]/70 text-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'text-white/75 hover:text-white/80 hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-[#EF4444]" />
            <span>Sell Ticket</span>
          </button>
        </div>

        {/* Order Type Selector: LIMIT vs MARKET (Floating Capsule) */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-white/75">
            Order Execution Type
          </span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#181B24] border border-white/20">
            <button
              type="button"
              onClick={() => setOrderType('LIMIT')}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all duration-200 cursor-pointer ${
                orderType === 'LIMIT'
                  ? 'bg-white/[0.08] border border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_12px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              LIMIT
            </button>
            <button
              type="button"
              onClick={() => setOrderType('MARKET')}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all duration-200 cursor-pointer ${
                orderType === 'MARKET'
                  ? 'bg-white/[0.08] border border-[#D4AF37]/50 text-[#F5D061] shadow-[0_0_12px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              MARKET
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-4">
          
          {/* Price Field (Lighting-Model Text Opacity) */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-white/80 font-medium">Limit Price (INR)</span>
              <span className="text-white/75">
                Cap: <strong className="text-[#F5D061] font-bold">₹{(maxSellPrice || 0).toLocaleString()}</strong>
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono text-[#D4AF37]">
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
                className={`w-full bg-[#181B24] hover:bg-[#1E222E] border rounded-2xl py-3 pl-8 pr-4 text-white font-mono text-sm focus:outline-none transition-all duration-300 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)] ${
                  collarError
                    ? 'border-[#EF4444] text-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/30'
                    : 'border-white/20 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20'
                } ${orderType === 'MARKET' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>

            {collarError && (
              <p className="text-[11px] font-mono text-[#EF4444] mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{collarError}</span>
              </p>
            )}
          </div>

          {/* Quantity Field */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-white/80 font-medium">Ticket Quantity</span>
              <span className="text-white/75">
                {isBuy ? (
                  <span>Required: <strong className="text-white/90">₹{(totalAmount || 0).toLocaleString()}</strong></span>
                ) : (
                  <span>In Vault: <strong className="text-[#F5D061]">{availableRelics || 0} pass(es)</strong></span>
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
                className="w-full bg-[#181B24] hover:bg-[#1E222E] border border-white/20 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 rounded-2xl py-3 px-4 text-white font-mono text-sm transition-all duration-300 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5),0_2px_8px_rgba(0,0,0,0.3)]"
              />
            </div>

            {/* Quick Quantity Chips with Tactile Elevate */}
            <div className="flex items-center gap-2 mt-2.5">
              {[1, 2, 3, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQuantity(val.toString())}
                  className={`flex-1 py-1.5 rounded-xl text-[11px] font-mono border transition-all duration-200 cursor-pointer shadow-sm ${
                    parseInt(quantity, 10) === val
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F5D061] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                      : 'bg-white/[0.06] border-white/20 text-white/75 hover:border-[#D4AF37]/40 hover:text-white'
                  }`}
                >
                  {val}
                </button>
              ))}
              {!isBuy && availableRelics > 0 && (
                <button
                  type="button"
                  onClick={() => setQuantity(availableRelics.toString())}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-mono bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-[#F5D061] hover:bg-[#D4AF37]/25 transition-all duration-200 cursor-pointer shadow-sm"
                >
                  MAX ({availableRelics})
                </button>
              )}
            </div>
          </div>

          {/* Live Balance Row & Quick Actions Bento Card */}
          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between text-white/75">
              <span>Available {isBuy ? 'Fiat Balance' : 'Vault Inventory'}:</span>
              <div className="flex items-center gap-2">
                {isBuy ? (
                  <span className="text-[#22C55E] font-bold text-sm">₹{(availableFiat || 0).toLocaleString()}</span>
                ) : (
                  <span className="text-[#F5D061] font-bold text-sm">{availableRelics || 0} Ticket(s)</span>
                )}
                {isBuy ? (
                  <button
                    type="button"
                    onClick={onOpenDepositModal}
                    className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37] hover:text-[#F5D061] hover:underline cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Deposit
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenImportModal}
                    className="inline-flex items-center gap-1 text-[11px] text-[#D4AF37] hover:text-[#F5D061] hover:underline cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Import
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/20 pt-2.5 text-white/80">
              <span className="font-semibold text-white/75">Estimated Escrow Lock:</span>
              <span className={`font-bold text-sm ${isBuy ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {isBuy ? `₹${(totalAmount || 0).toLocaleString()}` : `${numQty} Ticket(s)`}
              </span>
            </div>
          </div>

          {/* Atomic Escrow Security Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.05] border border-white/20 text-[11px] font-mono text-white/75">
            <Lock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
            <span>
              Protected escrow holds funds and passes until matched, then issues a fresh verified QR code to the buyer.
            </span>
          </div>

          </div>

          {/* Submit Order Button with Physical Tactile Depth */}
          {!isKycVerified ? (
            <div className="p-3.5 rounded-2xl bg-[#FB923C]/10 border border-[#FB923C]/30 text-center shadow-[0_4px_16px_rgba(251,146,60,0.1)]">
              <span className="text-xs font-mono text-[#FB923C] block mb-1 flex items-center justify-center gap-1.5 font-semibold">
                <ShieldAlert className="w-4 h-4" /> Identity Verification Required
              </span>
              <span className="text-[10px] font-mono text-white/75">
                Only KYC-verified traders are allowed to place secondary orders. Complete KYC in the compliance portal.
              </span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !!collarError}
              className={`w-full py-4 rounded-2xl font-sans font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                isBuy
                  ? 'bg-gradient-to-r from-[#16A34A] to-[#22C55E] hover:from-[#22C55E] hover:to-[#4ADE80] text-black shadow-[0_0_25px_rgba(34,197,94,0.35)]'
                  : 'bg-gradient-to-r from-[#DC2626] to-[#EF4444] hover:from-[#EF4444] hover:to-[#F87171] text-white shadow-[0_0_25px_rgba(239,68,68,0.35)]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Order...</span>
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
