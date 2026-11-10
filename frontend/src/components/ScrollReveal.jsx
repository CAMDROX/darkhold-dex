import React, { useEffect, useRef, useState } from 'react'

/**
 * ScrollReveal provides smooth, direction-aware scroll transitions when sections
 * enter or re-enter the viewport from either scrolling down or scrolling up.
 */
export default function ScrollReveal({
  children,
  delay = 0,
  className = '',
  innerClassName = '',
  initialVisible = false,
}) {
  const outerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(() => {
    if (initialVisible) return true
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return true
    }
    return false
  })
  const [fromAbove, setFromAbove] = useState(false)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) return

    const node = outerRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        } else {
          // Track whether the element left above (scrolled past downward)
          // or below (still ahead / scrolled up past it) so re-entry glides naturally.
          setFromAbove(entry.boundingClientRect.top < 0)
          setIsVisible(false)
        }
      },
      {
        threshold: 0.02,
        rootMargin: '-12px 0px -12px 0px',
      }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const hiddenClasses = fromAbove
    ? '-translate-y-7 opacity-0 scale-[0.985]'
    : 'translate-y-7 opacity-0 scale-[0.985]'

  return (
    <div ref={outerRef} className={className}>
      <div
        style={{ transitionDelay: isVisible && delay ? `${delay}ms` : '0ms' }}
        className={`transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isVisible ? 'translate-y-0 opacity-100 scale-100' : hiddenClasses
        } ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
