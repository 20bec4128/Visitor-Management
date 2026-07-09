import { useEffect, useState } from 'react'

const DEFAULT_QUERY = '(max-width: 767px)'

export default function useIsMobile(query = DEFAULT_QUERY) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.(query)?.matches ?? false
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(query)
    const handler = () => setIsMobile(media.matches)

    handler()

    if (media.addEventListener) {
      media.addEventListener('change', handler)
      return () => media.removeEventListener('change', handler)
    }

    media.addListener(handler)
    return () => media.removeListener(handler)
  }, [query])

  return isMobile
}

