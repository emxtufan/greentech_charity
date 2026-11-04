import { useCallback, useEffect, useRef, useState } from 'react'
import useContent from '../../hooks/useContent'
import { cx } from '../../utils/helpers'

const ARROW_PREV = '\u2039'
const ARROW_NEXT = '\u203A'
const DRAG_THRESHOLD = 40
const TRANSITION_MS = 500

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

  // în edit mode carousel-ul nu se mișca singur și nu poate fi târât
  const { editMode } = useContent()

  const [perView, setPerView] = useState(() =>
    typeof window === 'undefined' ? xs : perViewFor(window.innerWidth, { xs, md, xl })
  )
  const [index, setIndex] = useState(0)
  // animate=false doar în timpul saltului instant de la capătul buclei
  const [animate, setAnimate] = useState(true)
  const [dragOffset, setDragOffset] = useState(0)
  const [paused, setPaused] = useState(false)

  const drag = useRef({ active: false, startX: 0, startY: 0, moved: false })
  const suppressClickUntil = useRef(0)
  const jumpFrames = useRef({ first: 0, second: 0 })
  // true cât timp index === count e doar poziția temporară folosită de prev()
  const prevJump = useRef(false)

  const count = items.length
  const maxIndex = Math.max(count - perView, 0)
  // buclă infinită doar în afara edit mode, când sunt mai multe elemente decât încap
  const loopEnabled = !editMode && loop !== false && count > perView
  // clonele de la final fac trecerea de la ultimul card la primul fără salt vizibil
  const renderedItems = loopEnabled ? [...items, ...items.slice(0, perView)] : items
  const dragging = dragOffset !== 0

  // autoplay: true -> 5000ms, număr -> acel număr de ms, false/0 -> oprit (oprit și în edit mode)
  const autoplayDelay = editMode ? 0 : autoplay === true ? 5000 : Number(autoplay) || 0

  useEffect(() => {
    const handleResize = () => setPerView(perViewFor(window.innerWidth, { xs, md, xl }))

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [xs, md, xl])

  useEffect(() => {
    if (loopEnabled) return
    setIndex((current) => Math.min(current, maxIndex))
  }, [loopEnabled, maxIndex])

  const goTo = useCallback(
    (target) => {
      if (loopEnabled) {
        setAnimate(true)
        setIndex(((target % count) + count) % count)
        return
      }

      const total = maxIndex + 1
      if (total <= 1) {
        setIndex(0)
        return
      }
      setIndex(Math.min(Math.max(target, 0), maxIndex))
    },
    [loopEnabled, count, maxIndex]
  )

  // salt instant (fără tranziție); după ce browserul a pictat cadrul, tranziția e repornită pe dublu rAF
  const jumpTo = useCallback((target, after) => {
    setAnimate(false)
    setIndex(target)

    cancelAnimationFrame(jumpFrames.current.first)
    cancelAnimationFrame(jumpFrames.current.second)

    jumpFrames.current.first = window.requestAnimationFrame(() => {
      jumpFrames.current.second = window.requestAnimationFrame(() => {
        setAnimate(true)
        if (after) after()
      })
    })
  }, [])

  useEffect(
    () => () => {
      cancelAnimationFrame(jumpFrames.current.first)
      cancelAnimationFrame(jumpFrames.current.second)
    },
    []
  )

  const next = useCallback(() => {
    if (loopEnabled) {
      // suntem pe clone, așteptăm resetarea
      if (index >= count) return
      setAnimate(true)
      setIndex(index + 1)
      return
    }
    goTo(index + 1)
  }, [loopEnabled, index, count, goTo])

  const prev = useCallback(() => {
    if (loopEnabled) {
      if (index === 0) {
        // sări instant pe poziția echivalentă din clone, apoi animă înapoi la count - 1
        prevJump.current = true
        jumpTo(count, () => {
          prevJump.current = false
          setIndex(count - 1)
        })
        return
      }
      setAnimate(true)
      setIndex(index - 1)
      return
    }
    goTo(index - 1)
  }, [loopEnabled, index, count, goTo, jumpTo])

  const handlerRef = useRef({ prev, next })
  handlerRef.current = { prev, next }

  // după ce tranziția spre clone s-a terminat, sari la început fără animație
  // (transitionend pe track, cu timeout ca plasă de siguranță)
  useEffect(() => {
    if (!loopEnabled || index !== count || prevJump.current) return undefined

    let done = false
    const finish = () => {
      if (done) return
      done = true
      jumpTo(0)
    }
    const timer = window.setTimeout(finish, TRANSITION_MS + 50)

    return () => {
      done = true
      window.clearTimeout(timer)
    }
  }, [loopEnabled, index, count, jumpTo])

  const handleTransitionEnd = (event) => {
    if (!loopEnabled || index !== count || prevJump.current) return
    if (event.target !== event.currentTarget) return
    if (event.propertyName !== 'transform') return
    jumpTo(0)
  }

  // navigare prin butoane din afara componentei (prevRef / nextRef)
  // în edit mode săgețile externe nu sunt legate (slide-urile sunt afișate toate, static)
  useEffect(() => {
    if (editMode) return undefined

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
  }, [prevRef, nextRef, editMode])

  // autoplay cu pauză la hover / în timpul drag-ului
  useEffect(() => {
    if (!autoplayDelay || paused || dragging || maxIndex < 1) return undefined

    const timer = window.setInterval(() => next(), autoplayDelay)

    return () => window.clearInterval(timer)
  }, [autoplayDelay, paused, dragging, maxIndex, next])

  const handlePointerDown = (event) => {
    if (editMode || maxIndex < 1) return
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

  const trackStyle = editMode
    ? {
        // edit mode: toate slide-urile ca grilă statică (fără translate / tranziție)
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${gap}px`,
        transform: 'none',
        transition: 'none',
      }
    : {
        display: 'flex',
        gap: `${gap}px`,
        willChange: 'transform',
        transform: `translate3d(calc(${-index} * (${step})${dragPart}), 0, 0)`,
        transition: dragging || !animate ? 'none' : `transform ${TRANSITION_MS}ms ease`,
      }

  // margin:0 inline - bate `.slick-slide{margin:0 15px}` din tema (vendor CSS);
  // spațierea dintre slide-uri e asigurată exclusiv de `gap` pe track
  const slideStyle = { flex: `0 0 ${slideWidth}`, margin: 0 }

  // marginLeft/marginRight:0 inline - bate `.slick-slider{margin:0 -15px}` din tema (vendor CSS)
  return (
    <div
      className={cx('slick-slider slick-initialized', dots && !editMode && 'slick-dotted', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        userSelect: dragging ? 'none' : undefined,
        marginLeft: 0,
        marginRight: 0,
      }}
    >
      <div
        className="slick-list"
        style={{ overflow: editMode ? 'visible' : 'hidden', touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <div className="slick-track" style={trackStyle} onTransitionEnd={handleTransitionEnd}>
          {renderedItems.map((item, position) => {
            const cloned = position >= count
            const itemIndex = cloned ? position - count : position

            return (
              <div
                key={cloned ? `clone-${itemIndex}` : item && item.id != null ? item.id : position}
                className={cx(
                  'item',
                  'slick-slide',
                  cloned && 'slick-cloned',
                  position === index && 'slick-current',
                  position >= index && position < index + perView && 'slick-active'
                )}
                style={slideStyle}
                aria-hidden={cloned ? 'true' : undefined}
              >
                {renderItem ? renderItem(item, itemIndex) : null}
              </div>
            )
          })}
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

      {dots && !editMode && maxIndex > 0 && (
        <ul className="slick-dots d-flex justify-content-center style-none">
          {Array.from({ length: loopEnabled ? count : maxIndex + 1 }).map((_, dotIndex) => (
            <li
              key={dotIndex}
              className={dotIndex === (loopEnabled ? index % count : index) ? 'slick-active' : undefined}
            >
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
