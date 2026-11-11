import useInView from '../../hooks/useInView'
import { cx } from '../../utils/helpers'
import useContent from '../../hooks/useContent'

export default function Reveal({
  as: Tag = 'div',
  anim = 'slide-up',
  duration = 750,
  delay = 0,
  className = '',
  children,
  style,
  ...rest
}) {
  const [ref, inView] = useInView({ threshold: 0.15, once: true })
  const { editMode } = useContent()

  return (
    <Tag
      ref={ref}
      className={cx('site-reveal', className, (inView || editMode) && 'sal-animate')}
      style={{ '--sal-duration': `${duration}ms`, '--sal-delay': `${delay}ms`, ...style }}
      data-sal={anim}
      data-sal-duration={duration}
      data-sal-delay={delay}
      {...rest}
    >
      {children}
    </Tag>
  )
}
