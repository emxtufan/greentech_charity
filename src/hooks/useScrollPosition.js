import { useEffect, useState } from 'react'

export default function useScrollPosition() {
  const [scrollY, setScrollY] = useState(() => (typeof window === 'undefined' ? 0 : window.scrollY))

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrollY
}
