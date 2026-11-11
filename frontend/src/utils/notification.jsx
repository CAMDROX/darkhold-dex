import React from 'react'
import toast from 'react-hot-toast'
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Ticket,
  Wallet,
  Flame,
  Zap,
  ShieldCheck,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  X,
  Lock,
} from 'lucide-react'

// Spatial Toast Card Component
export function SpatialNotificationCard({ t, title, message, category, type = 'success', customIcon: CustomIcon }) {
  // Theme color mapping & optical gradients
  const config = {
    buy: {
      borderColor: 'border-[#22C55E]/40 hover:border-[#22C55E]/70',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]',
      tagBg: 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]',
      defaultCategory: 'SECONDARY MARKET · BUY EXECUTION',
      Icon: ArrowDownLeft,
      barColor: 'from-[#22C55E] to-[#16A34A]',
    },
    sell: {
      borderColor: 'border-[#D4AF37]/50 hover:border-[#D4AF37]/80',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#F5D061]',
      tagBg: 'bg-[#D4AF37]/10 border-[#D4AF37]/35 text-[#F5D061]',
      defaultCategory: 'SECONDARY MARKET · SELL OFFER',
      Icon: ArrowUpRight,
      barColor: 'from-[#D4AF37] to-[#F5D061]',
    },
    deposit: {
      borderColor: 'border-[#22C55E]/45 hover:border-[#22C55E]/75',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-gradient-to-br from-[#1A3526] to-[#16291F] border-[#22C55E]/50 text-[#22C55E]',
      tagBg: 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]',
      defaultCategory: 'WALLET · DEPOSIT CREDITED',
      Icon: Wallet,
      barColor: 'from-[#22C55E] to-[#34D399]',
    },
    ticket: {
      borderColor: 'border-[#D4AF37]/55 hover:border-[#D4AF37]/85',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-gradient-to-br from-[#332B1D] to-[#262118] border-[#D4AF37]/50 text-[#F5D061]',
      tagBg: 'bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#F5D061]',
      defaultCategory: 'TICKET VERIFICATION · ADDED',
      Icon: Ticket,
      barColor: 'from-[#D4AF37] to-[#F5D061]',
    },
    auction: {
      borderColor: 'border-[#F5D061]/50 hover:border-[#F5D061]/80',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-gradient-to-br from-[#34251D] to-[#271D18] border-[#F5D061]/50 text-[#F5D061]',
      tagBg: 'bg-[#F5D061]/10 border-[#F5D061]/35 text-[#F5D061]',
      defaultCategory: 'DUTCH AUCTION · PRICE DECAY',
      Icon: Flame,
      barColor: 'from-[#F5D061] to-[#D4AF37]',
    },
    success: {
      borderColor: 'border-[#22C55E]/40 hover:border-[#22C55E]/70',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]',
      tagBg: 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]',
      defaultCategory: 'SYSTEM NOTIFICATION',
      Icon: CheckCircle2,
      barColor: 'from-[#22C55E] to-[#16A34A]',
    },
    error: {
      borderColor: 'border-[#EF4444]/45 hover:border-[#EF4444]/75',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-gradient-to-br from-[#3B1D21] to-[#2B1619] border-[#EF4444]/50 text-[#EF4444]',
      tagBg: 'bg-[#EF4444]/15 border-[#EF4444]/35 text-[#EF4444]',
      defaultCategory: 'SECURITY & PROTOCOL ALERT',
      Icon: ShieldAlert,
      barColor: 'from-[#EF4444] to-[#B91C1C]',
    },
    warning: {
      borderColor: 'border-[#FB923C]/45 hover:border-[#FB923C]/75',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-[#FB923C]/15 border-[#FB923C]/40 text-[#FB923C]',
      tagBg: 'bg-[#FB923C]/10 border-[#FB923C]/30 text-[#FB923C]',
      defaultCategory: 'PROTOCOL WARNING',
      Icon: AlertTriangle,
      barColor: 'from-[#FB923C] to-[#EA580C]',
    },
    info: {
      borderColor: 'border-[#38BDF8]/40 hover:border-[#38BDF8]/70',
      glow: 'shadow-lg shadow-black/35',
      iconBg: 'bg-[#38BDF8]/15 border-[#38BDF8]/40 text-[#38BDF8]',
      tagBg: 'bg-[#38BDF8]/10 border-[#38BDF8]/30 text-[#38BDF8]',
      defaultCategory: 'NETWORK TELEMETRY',
      Icon: Info,
      barColor: 'from-[#38BDF8] to-[#0284C7]',
    },
  }

  const current = config[type] || config.info
  const IconComponent = CustomIcon || current.Icon

  return (
    <div
      className={`relative max-w-sm sm:max-w-md w-full rounded-2xl bg-[#222631]/98 backdrop-blur-2xl border ${current.borderColor} ${current.glow} p-4 text-white overflow-hidden transition-all duration-300 pointer-events-auto ${
        t.visible ? 'animate-spatial-pop' : 'opacity-0 scale-95 transition-opacity'
      }`}
    >
      {/* Ambient background reflection */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.04] to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-start gap-3.5">
        {/* Glowing Icon Frame */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-inner mt-0.5 ${current.iconBg}`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 pr-5">
          {/* Category Chip */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${current.tagBg}`}>
              {category || current.defaultCategory}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-sans font-bold text-sm text-white tracking-wide leading-tight truncate">
            {title}
          </h4>

          {/* Description / Telemetry Detail */}
          {message && (
            <p className="mt-1 text-xs font-mono text-white/70 leading-relaxed break-words">
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="absolute top-3.5 right-3.5 text-white/75 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle Bottom Accent Strip */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${current.barColor} opacity-75`} />
    </div>
  )
}

/**
 * Centralized Spatial Notification Service
 */
function showToast({ title, message, category, type = 'info', duration = 5000, customIcon }) {
  return toast.custom(
    (t) => (
      <SpatialNotificationCard
        t={t}
        title={title}
        message={message}
        category={category}
        type={type}
        customIcon={customIcon}
      />
    ),
    { duration }
  )
}

export const notify = {
  // Base Variants
  success: (title, message, options = {}) =>
    showToast({
      title,
      message,
      type: 'success',
      category: options.category || 'SYSTEM NOTIFICATION',
      duration: options.duration || 4500,
      customIcon: options.icon,
    }),

  error: (title, message, options = {}) =>
    showToast({
      title,
      message,
      type: 'error',
      category: options.category || 'SECURITY & PROTOCOL ALERT',
      duration: options.duration || 6500,
      customIcon: options.icon,
    }),

  warning: (title, message, options = {}) =>
    showToast({
      title,
      message,
      type: 'warning',
      category: options.category || 'PROTOCOL NOTICE',
      duration: options.duration || 5500,
      customIcon: options.icon,
    }),

  info: (title, message, options = {}) =>
    showToast({
      title,
      message,
      type: 'info',
      category: options.category || 'TELEMETRY STATUS',
      duration: options.duration || 4500,
      customIcon: options.icon,
    }),

  // Domain-Specific Specialized Handlers

  // 1. BUYING RELIC / ORDER MATCHED
  buyOrder: ({ symbol, price, quantity = 1, isMatched = false, tradesCount = 0 }) => {
    const formattedPrice = `₹${Number(price || 0).toLocaleString()}`
    if (isMatched) {
      return showToast({
        title: 'Buy Order Matched!',
        message: `${tradesCount > 1 ? `${tradesCount} fills executed` : '1 fill executed'} for ${quantity}x ${symbol} @ ${formattedPrice} with atomic escrow lock.`,
        category: 'ORDER MATCHED · EXECUTED',
        type: 'buy',
        duration: 5500,
        customIcon: Zap,
      })
    }
    return showToast({
      title: 'Buy Limit Order Resting',
      message: `Bidding ${quantity}x ${symbol} @ ${formattedPrice}. Escrowed INR locked for matching.`,
      category: 'SECONDARY MARKET · BID RECORDED',
      type: 'buy',
      duration: 4500,
      customIcon: ArrowDownLeft,
    })
  },

  // 2. SELLING RELIC / ORDER MATCHED
  sellOrder: ({ symbol, price, quantity = 1, isMatched = false, tradesCount = 0 }) => {
    const formattedPrice = `₹${Number(price || 0).toLocaleString()}`
    if (isMatched) {
      return showToast({
        title: 'Sell Order Settled!',
        message: `Sold ${quantity}x ${symbol} @ ${formattedPrice}${tradesCount > 1 ? ` (${tradesCount} fills)` : ''}. Proceeds credited directly to available balance.`,
        category: 'ORDER MATCHED · SETTLED',
        type: 'sell',
        duration: 5500,
        customIcon: Zap,
      })
    }
    return showToast({
      title: 'Sell Limit Order Resting',
      message: `Offering ${quantity}x ${symbol} @ ${formattedPrice}. Ticket reserved in escrow until matched.`,
      category: 'SECONDARY MARKET · ASK RECORDED',
      type: 'sell',
      duration: 4500,
      customIcon: ArrowUpRight,
    })
  },

  // 3. DEPOSITING MONEY
  depositSuccess: ({ amount, currency = 'INR', paymentId }) => {
    const symbol = currency === 'INR' ? '₹' : '$'
    const formattedAmount = `${symbol}${Number(amount || 0).toLocaleString()} ${currency}`
    return showToast({
      title: 'Deposit Credited!',
      message: `${formattedAmount} deposited via Razorpay simulation${paymentId ? ` (Ref: ${paymentId})` : ''} and credited to wallet balance.`,
      category: 'WALLET · DEPOSIT CREDITED',
      type: 'deposit',
      duration: 5500,
      customIcon: Wallet,
    })
  },

  // 4. IMPORTING TICKET
  ticketImportQueued: ({ ticketId, eventSymbol, jobId }) => {
    return showToast({
      title: 'Ticket Queued for Verification',
      message: `Barcode ${ticketId} for ${eventSymbol} queued for asynchronous verification${jobId ? ` (${jobId})` : ''}.`,
      category: 'TICKET VERIFICATION · QUEUED',
      type: 'ticket',
      duration: 5000,
      customIcon: Ticket,
    })
  },

  // 5. TICKET MINTED VIA WORKER
  ticketMinted: ({ eventSymbol, ticketId }) => {
    return showToast({
      title: 'Ticket Verified & Added!',
      message: `1x ${eventSymbol || 'Festival'} pass ${ticketId ? `(${ticketId}) ` : ''}verified and added to your Treasury Vault inventory.`,
      category: 'MY TICKETS · VERIFIED PASS ADDED',
      type: 'ticket',
      duration: 6000,
      customIcon: Sparkles,
    })
  },

  // 6. DUTCH AUCTION CREATION & SNIPING
  auctionCreated: ({ eventSymbol, startPrice, reservePrice }) => {
    return showToast({
      title: 'Dutch Auction Launched!',
      message: `${eventSymbol} price decay active: starting @ ₹${Number(startPrice).toLocaleString()} down to floor ₹${Number(reservePrice).toLocaleString()}.`,
      category: 'DUTCH AUCTION · PRICE DECAY LIVE',
      type: 'auction',
      duration: 5000,
      customIcon: Flame,
    })
  },

  auctionSniped: ({ eventSymbol, price }) => {
    return showToast({
      title: 'Auction Ticket Purchased!',
      message: `Secured 1x ${eventSymbol || 'Festival'} pass at ₹${Number(price || 0).toLocaleString()}! Cryptographic token unlocked in Vault.`,
      category: 'DUTCH AUCTION · PURCHASED',
      type: 'auction',
      duration: 6000,
      customIcon: Zap,
    })
  },

  // 7. ORDER CANCELLATION
  orderCancelled: ({ orderId, eventSymbol }) => {
    return showToast({
      title: 'Order Cancelled',
      message: `Resting position ${orderId ? `(${orderId}) ` : ''}for ${eventSymbol || 'market'} cancelled. Escrowed assets released back to balance.`,
      category: 'SECONDARY MARKET · ESCROW RELEASE',
      type: 'info',
      duration: 4000,
      customIcon: Lock,
    })
  },

  // 8. KYC & IDENTITY UPDATES
  kycUpdated: ({ status, reason }) => {
    if (status === 'verified') {
      return showToast({
        title: 'Identity Verified!',
        message: 'Full secondary ticket trading and wallet features are now unlocked.',
        category: 'COMPLIANCE GATE · KYC VERIFIED',
        type: 'success',
        duration: 6000,
        customIcon: ShieldCheck,
      })
    }
    return showToast({
      title: 'Verification Update',
      message: reason || 'Government proof document could not be verified by compliance.',
      category: 'COMPLIANCE GATE · REVIEW REJECTED',
      type: 'error',
      duration: 7000,
      customIcon: ShieldAlert,
    })
  },
}

export default notify
