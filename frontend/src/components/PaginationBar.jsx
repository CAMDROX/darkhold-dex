import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WINDOW_SIZE = 5

/**
 * Generates sliding 5-page pagination tokens:
 * - <= 5 pages: [1, 2, ..., totalPages]
 * - > 5 pages:
 *   - pages 1..4 -> [1, 2, 3, 4, 5, 'ellipsis-right']
 *   - page >= 5  -> shifts window right one by one, removing previous pages
 *                   and adding '...' separators cleanly.
 */
function getSlidingPageTokens(currentPage, totalPages) {
  if (totalPages <= WINDOW_SIZE) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const end = Math.min(totalPages, Math.max(WINDOW_SIZE, currentPage + 1))
  const start = Math.max(1, end - (WINDOW_SIZE - 1))

  const tokens = []
  if (start > 1) {
    tokens.push('ellipsis-left')
  }
  for (let p = start; p <= end; p++) {
    tokens.push(p)
  }
  if (end < totalPages) {
    tokens.push('ellipsis-right')
  }
  return tokens
}

export default function PaginationBar({
  currentPage,
  totalItems,
  pageSize = 10,
  itemLabel = 'items',
  onPageChange,
  compact = false,
}) {
  if (totalItems <= 0) return null

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIdx = (safePage - 1) * pageSize
  const endIdx = Math.min(startIdx + pageSize, totalItems)
  const tokens = getSlidingPageTokens(safePage, totalPages)

  return (
    <div
      className={`border-t border-white/20 flex ${
        compact ? 'flex-col sm:flex-row pt-3 gap-2.5' : 'flex-col sm:flex-row pt-4 gap-3'
      } items-center justify-between text-xs font-mono`}
    >
      <div className="text-white/75 text-[11px]">
        Showing <span className="text-white font-semibold">{startIdx + 1}</span>–
        <span className="text-white font-semibold">{endIdx}</span> of{' '}
        <span className="text-[#F5D061] font-semibold">{totalItems}</span> {itemLabel}
        {' · '}
        Page <span className="text-white font-semibold">{safePage}</span> of{' '}
        <span className="text-white font-semibold">{totalPages}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="Previous page"
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {!compact && <span className="hidden sm:inline">Prev</span>}
        </button>

        {tokens.map((token) =>
          typeof token === 'string' ? (
            <span
              key={token}
              className="px-1.5 py-1 text-white/70 tracking-widest select-none"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={token}
              type="button"
              onClick={() => onPageChange(token)}
              aria-current={token === safePage ? 'page' : undefined}
              className={`min-w-[30px] h-8 px-2.5 rounded-xl font-mono text-xs transition-all duration-200 cursor-pointer ${
                token === safePage
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F5D061] text-[#111318] font-bold border border-[#F5D061] shadow-[0_0_14px_rgba(212,175,55,0.3)]'
                  : 'bg-[#181B24] hover:bg-white/[0.10] border border-white/20 hover:border-[#D4AF37]/50 text-white/80 hover:text-white'
              }`}
            >
              {token}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          aria-label="Next page"
          className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer flex items-center gap-1"
        >
          {!compact && <span className="hidden sm:inline">Next</span>}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
