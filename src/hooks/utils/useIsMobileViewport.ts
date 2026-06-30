import { useEffect, useState } from 'react'

/**
 * Detects if the viewport is mobile (<768px, below Tailwind's md breakpoint)
 * @returns true if viewport width < 768px
 */
export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
