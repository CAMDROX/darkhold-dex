import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

/**
 * Custom dark-slate & gold spatial dropdown component rendered via React Portal
 * so menus are never clipped inside overflow-hidden cards or modals.
 */
export default function ThemedDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  variant = 'default', // 'default' | 'prominent' | 'embedded'
  accent = 'gold', // 'gold' | 'amber'
  className = '',
  buttonClassName = '',
  minMenuWidth,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 240,
    openUpwards: false,
    bottom: 0,
  })

  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value)
  const selectedIndex = options.findIndex((opt) => opt.value === value)

  const computeCoords = () => {
    if (!triggerRef.current) return null
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const menuWidth = Math.max(rect.width, minMenuWidth || 0)
    const spaceBelow = viewportH - rect.bottom - 12
    const spaceAbove = rect.top - 12
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow
    const clampedLeft = Math.max(12, Math.min(rect.left, viewportW - menuWidth - 12))

    return {
      top: rect.bottom + 8,
      bottom: viewportH - rect.top + 8,
      left: clampedLeft,
      width: menuWidth,
      openUpwards,
    }
  }

  const handleToggle = () => {
    if (disabled || options.length === 0) return
    if (!isOpen) {
      const nextCoords = computeCoords()
      if (nextCoords) setCoords(nextCoords)
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const handleSelect = (optValue) => {
    if (optValue !== value) {
      onChange?.(optValue)
    }
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (e) => {
      const clickedTrigger = triggerRef.current?.contains(e.target)
      const clickedMenu = menuRef.current?.contains(e.target)
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false)
      }
    }

    const handleScrollOrResize = (e) => {
      if (e.type === 'scroll' && menuRef.current?.contains(e.target)) {
        return
      }
      setIsOpen(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        triggerRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, options.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + options.length) % Math.max(1, options.length))
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const targetOpt = options[highlightedIndex]
        if (targetOpt && !targetOpt.disabled) {
          if (targetOpt.value !== value) {
            onChange?.(targetOpt.value)
          }
          setIsOpen(false)
          triggerRef.current?.focus()
        }
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, highlightedIndex, options, value, onChange])

  const isAmber = accent === 'amber'
  const activeRingClass = isAmber
    ? 'border-[#FB923C] ring-2 ring-[#FB923C]/20'
    : 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20'

  const baseTriggerStyle =
    variant === 'prominent'
      ? `w-full sm:w-auto flex items-center justify-between gap-3 bg-white/[0.07] hover:bg-white/[0.13] border text-white font-sans font-bold text-sm sm:text-base rounded-2xl px-4 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] ${
          isOpen
            ? activeRingClass
            : 'border-white/20 hover:border-[#D4AF37]/60'
        }`
      : variant === 'embedded'
      ? `h-full flex items-center justify-between gap-2 px-4 py-3 bg-transparent hover:bg-white/[0.05] text-white font-mono font-bold text-sm rounded-l-2xl focus:outline-none`
      : `w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#181B24] hover:bg-[#1E222D] border text-xs font-mono text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.45)] ${
          isOpen
            ? activeRingClass
            : isAmber
            ? 'border-white/20 hover:border-[#FB923C]/70'
            : 'border-white/20 hover:border-[#D4AF37]/60'
        }`

  const menuBorderAccent = isAmber
    ? 'border-[#FB923C]/45 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75),0_0_22px_rgba(251,146,60,0.14),inset_0_1px_0_rgba(255,255,255,0.12)]'
    : 'border-[#D4AF37]/45 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.75),0_0_24px_rgba(212,175,55,0.14),inset_0_1px_0_rgba(255,255,255,0.12)]'

  const portalMenu =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              ...(coords.openUpwards
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              zIndex: 9999,
            }}
            className={`rounded-2xl bg-[#222631]/98 backdrop-blur-2xl border ${menuBorderAccent} p-1.5 max-h-64 overflow-y-auto animate-spatial-pop`}
          >
            {options.length === 0 ? (
              <div className="px-3.5 py-3 text-xs font-mono text-white/70 text-center">
                {placeholder}
              </div>
            ) : (
              <div className="space-y-1">
                {options.map((opt, idx) => {
                  const isSelected = opt.value === value
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                        isSelected
                          ? isAmber
                            ? 'bg-gradient-to-r from-[#FB923C]/20 to-[#FB923C]/10 border-[#FB923C]/50 text-[#FDBA74] font-semibold'
                            : 'bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/10 border-[#D4AF37]/50 text-[#F5D061] font-semibold'
                          : isHighlighted
                          ? 'bg-white/[0.10] border-white/20 text-white'
                          : 'bg-transparent border-transparent text-white/85 hover:bg-white/[0.08]'
                      } ${opt.disabled ? 'opacity-45 cursor-not-allowed' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-sans font-semibold truncate">
                          {opt.label}
                        </div>
                        {opt.sublabel && (
                          <div className="text-[10px] font-mono text-white/70 truncate mt-0.5">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {opt.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                              isSelected
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37]/45 text-[#F5D061]'
                                : 'bg-white/[0.06] border-white/20 text-white/75'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isAmber ? 'text-[#FB923C]' : 'text-[#F5D061]'
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>,
          document.body
        )
      : null

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            handleToggle()
          }
        }}
        className={`${baseTriggerStyle} transition-all duration-200 focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${buttonClassName}`}
      >
        <span className="truncate text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isAmber ? 'text-[#FB923C]' : 'text-[#D4AF37]'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {portalMenu}
    </div>
  )
}
