import React, { useState } from 'react'
import {
  Clock,
  X,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import { ordersApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function MyOrdersTable({
  orders = [],
  isLoading = false,
  onOrderCancelled,
  onRefresh,
}) {
  const [cancellingId, setCancellingId] = useState(null)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'all'

  const safeOrders = Array.isArray(orders) ? orders : []
  const activeOrders = safeOrders.filter(
    (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
  )
  const displayOrders = activeTab === 'active' ? activeOrders : safeOrders

  const handleCancel = async (orderId) => {
    if (!orderId) return
    setCancellingId(orderId)
    try {
      const resp = await ordersApi.cancelOrder(orderId)
      if (resp && resp.success) {
        toast.success('Order cancelled. Escrowed assets released to your available balance.', {
          icon: '🔓',
        })
        onOrderCancelled?.(orderId)
      }
    } catch (err) {
      console.error('[Cancel Order Error]:', err)
      toast.error(err.message || 'Failed to cancel order')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.04),inset_0_1px_0_rgba(255,255,255,0.1)] space-y-4 transition-all duration-300">
      {/* Top Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-cinzel font-bold text-base text-white tracking-wide">
            My Orders & Escrow Positions
          </h3>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono ml-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white/[0.08] border border-[#D4AF37]/50 text-[#F5D061] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] scale-[1.02]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Open Orders ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white/[0.08] border border-[#D4AF37]/50 text-[#F5D061] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] scale-[1.02]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Order History ({orders.length})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all duration-200 cursor-pointer hover:scale-105"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders Table with Light-Model Text Opacity Hierarchy */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-white/40 uppercase text-[10px] tracking-widest">
              <th className="py-3 px-3.5">Date / Time</th>
              <th className="py-3 px-3.5">Market</th>
              <th className="py-3 px-3.5">Side</th>
              <th className="py-3 px-3.5">Type</th>
              <th className="py-3 px-3.5 text-right">Price</th>
              <th className="py-3 px-3.5 text-right">Qty</th>
              <th className="py-3 px-3.5 text-right">Filled</th>
              <th className="py-3 px-3.5 text-center">Status</th>
              <th className="py-3 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {displayOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-xs text-white/30">
                  {activeTab === 'active'
                    ? 'No open orders resting on the book. Place a Buy or Sell order to get started.'
                    : 'No orders recorded yet.'}
                </td>
              </tr>
            ) : (
              displayOrders.map((order) => {
                const isBuy = order.side === 'BUY'
                const isOpen = order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'
                const formattedDate = order.created_at
                  ? new Date(order.created_at).toLocaleString('en-GB', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent'

                return (
                  <tr key={order.id} className="hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200 group">
                    {/* Date/Time: 50% Opacity Secondary */}
                    <td className="py-3.5 px-3.5 text-white/50 whitespace-nowrap text-[11px]">
                      {formattedDate}
                    </td>

                    {/* Market Symbol: 100% Opacity Primary */}
                    <td className="py-3.5 px-3.5 font-bold text-white tracking-wide">
                      {order.event_symbol}
                    </td>

                    {/* Side Pill */}
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isBuy
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                        }`}
                      >
                        {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {order.side}
                      </span>
                    </td>

                    {/* Order Type: 60% Opacity */}
                    <td className="py-3.5 px-3.5 text-white/60">
                      {order.order_type}
                    </td>

                    {/* Price: 100% Opacity Primary Value */}
                    <td className="py-3.5 px-3.5 text-right font-bold text-white text-sm">
                      ₹{order.price ? Math.round(order.price).toLocaleString() : '0'}
                    </td>

                    {/* Quantity: 70% Opacity */}
                    <td className="py-3.5 px-3.5 text-right text-white/70">
                      {order.quantity}
                    </td>

                    {/* Filled Ratio: 90% Opacity */}
                    <td className="py-3.5 px-3.5 text-right text-white/90">
                      {order.filled_quantity || 0} / {order.quantity}
                    </td>

                    {/* Status Pill with Specular Tint */}
                    <td className="py-3.5 px-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          order.status === 'FILLED'
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                            : order.status === 'OPEN'
                            ? 'bg-[#F5D061]/15 text-[#F5D061] border border-[#D4AF37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                            : order.status === 'PARTIALLY_FILLED'
                            ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
                            : 'bg-white/[0.04] text-white/50 border border-white/[0.08]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3.5 text-right">
                      {isOpen ? (
                        <button
                          type="button"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancel(order.id)}
                          className="px-3 py-1 rounded-xl bg-[#EF4444]/10 hover:bg-[#EF4444]/25 border border-[#EF4444]/35 text-[#EF4444] text-[10px] font-bold transition-all duration-200 inline-flex items-center gap-1 cursor-pointer hover:-translate-y-0.5 disabled:opacity-50 shadow-sm"
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <span className="text-white/20 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
