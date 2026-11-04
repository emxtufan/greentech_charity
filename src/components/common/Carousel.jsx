import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '../../utils/helpers'

const ARROW_PREV = '\u2039'
const ARROW_NEXT = '\u203A'
const DRAG_THRESHOLD = 40

const perViewFor = (width, { xs = 1, md = 2, xl = 3 } = {}) => {
  if (width >= 1200) return xl
  if (width >= 768) return md
  return xs
}

export default function Carousel({
  items = [],
  renderItem,
  slidesToShow = { xs: 1, md: 2, xl: 3 },
  gap = 30,
  autoplay = 5000,
  loop = false,
  arrows = false,
  dots = false,
  prevRef,
  nextRef,
  className = '',
}) {
  const { xs = 1, md = 2, xl = 3 } = slidesToShow

  const [perView, setPerView] = useState(() =>
    typeof window === 'undefined' ? xs : perViewFor(window.innerWidth, { xs, md, xl })
  )
  const [index, setIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [paused, setPaused] = useState(false)

  const drag = useRef({ active: false, startX: 0, startY: 0, moved: false })
  const suppressClickUntil = useRef(0)

  const count = items.length
  const maxIndex = Math.max(count - perView, 0)
  const dragging = dragOffset !== 0

  // autoplay: true -> 5000ms, număr -> acel număr de ms, false/0 -> oprit
  const autoplayDelay = autoplay === true ? 5000 : Number(autoplay) || 0

  useEffect(() => {
    const handleResize = () => setPerView(perViewFor(window.innerWidth, { xs, md, xl }))

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [xs, md, xl])

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex))
  }, [maxIndex])

  const goTo = useCallback(
    (target) => {
      const total = maxIndex + 1
      if (total <= 1) {
        setIndex(0)
        return
      }
      if (loop) {
        setIndex(((target % total) + total) % total)
        return
      }
      setIndex(Math.min(Math.max(target, 0), maxIndex))
    },
    [loop, maxIndex]
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  const handlerRef = useRef({ prev, next })
  handlerRef.current = { prev, next }

  // navigare prin butoane din afara componentei (prevRef / nextRef)
  useEffect(() => {
    const prevEl = prevRef && prevRef.current
    const nextEl = nextRef && nextRef.current

    const handlePrev = (event) => {
      event.preventDefault()
      handlerRef.current.prev()
    }
    const handleNext = (event) => {
      event.preventDefault()
      handlerRef.current.next()
    }

    if (prevEl) prevEl.addEventListener('click', handlePrev)
    if (nextEl) nextEl.addEventListener('click', handleNext)

    return () => {
      if (prevEl) prevEl.removeEventListener('click', handlePrev)
      if (nextEl) nextEl.removeEventListener('click', handleNext)
    }
  }, [prevRef, nextRef])

  // autoplay cu pauză la hover / în timpul drag-ului
  useEffect(() => {
    if (!autoplayDelay || paused || dragging || maxIndex < 1) return undefined

    const timer = window.setInterval(() => next(), autoplayDelay)

    return () => window.clearInterval(timer)
  }, [autoplayDelay, paused, dragging, maxIndex, next])

  const handlePointerDown = (event) => {
    if (maxIndex < 1) return
    drag.current = { active: true, startX: event.clientX, startY: event.clientY, moved: false }
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event) => {
    if (!drag.current.active) return

    const deltaX = event.clientX - drag.current.startX
    const deltaY = event.clientY - drag.current.startY

    if (!drag.current.moved) {
      if (Math.abs(deltaX) < 6) return
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        drag.current.active = false
        setDragOffset(0)
        return
      }
      drag.current.moved = true
    }

    setDragOffset(deltaX)
  }

  const handlePointerUp = () => {
    if (!drag.current.active) return

    const deltaX = dragOffset
    const moved = drag.current.moved
    drag.current = { active: false, startX: 0, startY: 0, moved: false }
    setDragOffset(0)

    if (!moved) return

    suppressClickUntil.current = Date.now() + 300
    if (deltaX <= -DRAG_THRESHOLD) next()
    else if (deltaX >= DRAG_THRESHOLD) prev()
  }

  const handleClickCapture = (event) => {
    if (Date.now() < suppressClickUntil.current) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const gapTotal = gap * Math.max(perView - 1, 0)
  const slideWidth = `calc((100% - ${gapTotal}px) / ${perView})`
  const step = `${slideWidth} + ${gap}px`
  const dragPart =
    dragOffset === 0 ? '' : dragOffset > 0 ? ` + ${dragOffset}px` : ` - ${Math.abs(dragOffset)}px`

  const trackStyle = {
    display: 'flex',
    gap: `${gap}px`,
    willChange: 'transform',
    transform: `translate3d(calc(${-index} * (${step})${dragPart}), 0, 0)`,
    transition: dragging ? 'none' : 'transform 500ms ease',
  }

  const slideStyle = { flex: `0 0 ${slideWidth}` }

  return (
    <div
      className={cx('slick-slider slick-initialized', dots && 'slick-dotted', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ userSelect: dragging ? 'none' : undefined }}
    >
      <div
        className="slick-list"
        style={{ overflow: 'hidden', touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <div className="slick-track" style={trackStyle}>
          {items.map((item, itemIndex) => (
            <div
              key={item && item.id != null ? item.id : itemIndex}
              className={cx(
                'item',
                'slick-slide',
                itemIndex === index && 'slick-current',
                itemIndex >= index && itemIndex < index + perView && 'slick-active'
              )}
              style={slideStyle}
            >
              {renderItem ? renderItem(item, itemIndex) : null}
            </div>
          ))}
        </div>
      </div>

      {arrows && (
        <div className="slider-arrows d-flex justify-content-center">
          <button type="button" className="prev_a slick-arrow" onClick={prev} aria-label="Previous">
            {ARROW_PREV}
          </button>
          <button type="button" className="next_a slick-arrow" onClick={next} aria-label="Next">
            {ARROW_NEXT}
          </button>
        </div>
      )}

      {dots && maxIndex > 0 && (
        <ul className="slick-dots d-flex justify-content-center style-none">
          {Array.from({ length: maxIndex + 1 }).map((_, dotIndex) => (
            <li key={dotIndex} className={dotIndex === index ? 'slick-active' : undefined}>
              <button
                type="button"
                onClick={() => goTo(dotIndex)}
                aria-label={`Go to slide ${dotIndex + 1}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
