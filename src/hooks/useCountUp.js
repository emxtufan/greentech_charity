import { useEffect, useRef, useState } from 'react'

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)

export default function useCountUp(end, { duration = 2000, start = true } = {}) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(0)

  useEffect(() => {
    if (!start) return undefined

    const target = Number(end)
    if (!Number.isFinite(target) || duration <= 0) {
      setValue(Number.isFinite(target) ? target : 0)
      return undefined
    }

    const startedAt = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      if (progress < 1) {
        setValue(target * easeOutCubic(progress))
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameRef.current)
  }, [end, duration, start])

  return value
}
