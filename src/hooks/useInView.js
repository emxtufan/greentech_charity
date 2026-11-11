import { createContext, useContext, useEffect, useRef, useState } from 'react'

export const PageVisibilityContext = createContext(true)

export default function useInView(options = { threshold: 0.15, once: true }) {
  const { threshold = 0.15, once = true, root = null, rootMargin = '0px' } = options
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  const pageVisible = useContext(PageVisibilityContext)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    if (!pageVisible) {
      setInView(false)
      return undefined
    }

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true)
            if (once) observer.unobserve(entry.target)
          } else if (!once) {
            setInView(false)
          }
        })
      },
      { threshold, root, rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, once, root, rootMargin, pageVisible])

  return [ref, pageVisible && inView]
}
