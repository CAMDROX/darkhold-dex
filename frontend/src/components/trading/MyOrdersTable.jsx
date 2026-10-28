import React, { useState } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react'
import { ordersApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function MyOrdersTable({
  orders,
  isLoading,
  onOrderCancelled,
  onRefresh,
}) {
  const [cancellingId, setCancellingId] = useState(null)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'all'

  const activeOrders = orders.filter(
    (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
  )
  const displayOrders = activeTab === 'active' ? activeOrders : orders

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
    <div className="rounded-2xl gloss-panel border border-[#2A211B] p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.7)] space-y-4">
      {/* Top Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#221B16]">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-cinzel font-bold text-base text-white tracking-wide">
            My Orders & Escrow Positions
          </h3>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0F0D0B] border border-[#251D18] text-xs font-mono ml-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] font-bold'
                  : 'text-[#8E867A] hover:text-white'
              }`}
            >
              Open Orders ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#F5D061] font-bold'
                  : 'text-[#8E867A] hover:text-white'
              }`}
            >
              Order History ({orders.length})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-lg bg-[#14100E] border border-[#2A211B] text-[#A8A195] hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-colors cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-[#1C1613] text-[#8E867A] uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Date / Time</th>
              <th className="py-2.5 px-3">Market</th>
              <th className="py-2.5 px-3">Side</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3 text-right">Price</th>
              <th className="py-2.5 px-3 text-right">Qty</th>
              <th className="py-2.5 px-3 text-right">Filled</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15110E]">
            {displayOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-xs text-[#6A6357]">
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
                  <tr key={order.id} className="hover:bg-[#120F0D] transition-colors">
                    <td className="py-3 px-3 text-[#A8A195] whitespace-nowrap">
                      {formattedDate}
                    </td>

                    <td className="py-3 px-3 font-semibold text-white">
                      {order.event_symbol}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                            : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                        }`}
                      >
                        {isBuy ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {order.side}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#C0B7A8]">
                      {order.order_type}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-white">
                      ₹{order.price ? Math.round(order.price).toLocaleString() : '0'}
                    </td>

                    <td className="py-3 px-3 text-right text-[#C0B7A8]">
                      {order.quantity}
                    </td>

                    <td className="py-3 px-3 text-right text-[#E0DBD2]">
                      {order.filled_quantity || 0} / {order.quantity}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          order.status === 'FILLED'
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                            : order.status === 'OPEN'
                            ? 'bg-[#F5D061]/15 text-[#F5D061] border border-[#F5D061]/30'
                            : order.status === 'PARTIALLY_FILLED'
                            ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
                            : 'bg-[#8E867A]/15 text-[#8E867A] border border-[#8E867A]/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {isOpen ? (
                        <button
                          type="button"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancel(order.id)}
                          className="px-2.5 py-1 rounded bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[10px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <span className="text-[#6A6357] text-[10px]">—</span>
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
