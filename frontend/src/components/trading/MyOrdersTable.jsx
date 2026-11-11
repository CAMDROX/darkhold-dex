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
import { notify } from '../../utils/notification'
import PaginationBar from '../PaginationBar'

const ITEMS_PER_PAGE = 10

export default function MyOrdersTable({
  orders = [],
  isLoading = false,
  onOrderCancelled,
  onRefresh,
}) {
  const [cancellingId, setCancellingId] = useState(null)
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'all'
  const [currentPage, setCurrentPage] = useState(1)

  const safeOrders = Array.isArray(orders) ? orders : []
  const activeOrders = safeOrders.filter(
    (o) => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'
  )
  const displayOrders = activeTab === 'active' ? activeOrders : safeOrders

  const totalOrders = displayOrders.length
  const totalPages = Math.max(1, Math.ceil(totalOrders / ITEMS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIdx = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const paginatedOrders = displayOrders.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const handleCancel = async (orderId) => {
    if (!orderId) return
    setCancellingId(orderId)
    try {
      const resp = await ordersApi.cancelOrder(orderId)
      if (resp && resp.success) {
        notify.orderCancelled({ orderId })
        onOrderCancelled?.(orderId)
      }
    } catch (err) {
      console.error('[Cancel Order Error]:', err)
      notify.error('Cancel Order Failed', err.message || 'Failed to cancel resting order')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="rounded-3xl spatial-glass p-5 sm:p-6 shadow-lg shadow-black/40 flex flex-col gap-4 transition-all duration-300">
      {/* Top Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-sans font-bold text-base text-white tracking-wide">
            My Orders & Escrow Positions
          </h3>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#181B24] border border-white/20 text-xs font-mono ml-2">
            <button
              type="button"
              onClick={() => handleTabChange('active')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white/[0.08] border border-[#D4AF37]/50 text-[#F5D061] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Open Orders ({activeOrders.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`px-3 py-1 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white/[0.08] border border-[#D4AF37]/50 text-[#F5D061] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Order History ({safeOrders.length})
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] border border-white/20 text-white/75 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all duration-200 cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Orders Table (Fixed-Height Window So Switching Pages or Empty States Never Shifts Layout) */}
      <div className="h-[468px] overflow-x-auto overflow-y-auto pr-1">
        <table className="w-full text-left font-mono text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-[#222632]/95 backdrop-blur-md">
            <tr className="text-white/75 uppercase text-[10px] tracking-widest">
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20">Date / Time</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20">Market</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20">Side</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20">Type</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20 text-right">Price</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20 text-right">Qty</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20 text-right">Filled</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20 text-center">Status</th>
              <th className="py-2.5 px-3.5 whitespace-nowrap border-b border-white/20 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="h-[416px] align-middle text-center text-xs text-white/75">
                  {activeTab === 'active'
                    ? 'No open orders resting on the book. Place a Buy or Sell order to get started.'
                    : 'No orders recorded yet.'}
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => {
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
                  <tr key={order.id} className="hover:bg-white/[0.07] transition-all duration-200 group">
                    <td className="py-2.5 px-3.5 text-white/75 whitespace-nowrap text-[11px]">
                      {formattedDate}
                    </td>

                    <td className="py-2.5 px-3.5 font-bold text-white tracking-wide whitespace-nowrap">
                      {order.event_symbol}
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap">
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

                    <td className="py-2.5 px-3.5 text-white/75 whitespace-nowrap">
                      {order.order_type}
                    </td>

                    <td className="py-2.5 px-3.5 text-right font-bold text-white text-sm whitespace-nowrap">
                      ₹{order.price ? Math.round(order.price).toLocaleString() : '0'}
                    </td>

                    <td className="py-2.5 px-3.5 text-right text-white/70 whitespace-nowrap">
                      {order.quantity}
                    </td>

                    <td className="py-2.5 px-3.5 text-right text-white/90 whitespace-nowrap">
                      {order.filled_quantity || 0} / {order.quantity}
                    </td>

                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          order.status === 'FILLED'
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                            : order.status === 'OPEN'
                            ? 'bg-[#F5D061]/15 text-[#F5D061] border border-[#D4AF37]/40 shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                            : order.status === 'PARTIALLY_FILLED'
                            ? 'bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30'
                            : 'bg-white/[0.07] text-white/75 border border-white/20'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      {isOpen ? (
                        <button
                          type="button"
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancel(order.id)}
                          className="px-3 py-1 rounded-xl bg-[#EF4444]/10 hover:bg-[#EF4444]/25 border border-[#EF4444]/35 text-[#EF4444] text-[10px] font-bold transition-all duration-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          {cancellingId === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <span className="text-white/75 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sliding 5-Page Numbered Pagination Footer (Fixed Height Even When Empty) */}
      {totalOrders > 0 ? (
        <PaginationBar
          currentPage={safeCurrentPage}
          totalItems={totalOrders}
          pageSize={ITEMS_PER_PAGE}
          itemLabel={activeTab === 'active' ? 'open orders' : 'orders'}
          onPageChange={setCurrentPage}
        />
      ) : (
        <div className="border-t border-white/20 flex flex-col sm:flex-row pt-4 gap-3 items-center justify-between text-xs font-mono">
          <div className="text-white/75 text-[11px] h-8 flex items-center">
            Showing <span className="text-white font-semibold mx-1">0</span>
            {activeTab === 'active' ? 'open orders' : 'orders'} · Page
            <span className="text-white font-semibold mx-1">1</span> of
            <span className="text-white font-semibold ml-1">1</span>
          </div>
          <div className="h-8 flex items-center text-[11px] text-white/50">
            Up to date
          </div>
        </div>
      )}
    </div>
  )
}
