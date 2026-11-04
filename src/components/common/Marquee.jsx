import { cx } from '../../utils/helpers'

export default function Marquee({
  children,
  vertical = false,
  reverse = false,
  pauseOnHover = false,
  repeat = 2,
  duration = 40,
  gap = 16,
  paused = false,
  className,
  style,
}) {
  return (
    <div
      className={cx(
        'marquee',
        vertical && 'marquee--vertical',
        pauseOnHover && 'marquee--pause-hover',
        paused && 'marquee--paused',
        reverse && 'marquee--reverse',
        className
      )}
      style={{ '--duration': `${duration}s`, '--gap': `${gap}px`, ...style }}
    >
      {Array.from({ length: paused ? 1 : repeat }).map((_, i) => (
        <div className="marquee__track" aria-hidden={i > 0 || undefined} key={i}>
          {children}
        </div>
      ))}
    </div>
  )
}
