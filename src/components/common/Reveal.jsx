import useInView from '../../hooks/useInView'
import { cx } from '../../utils/helpers'

export default function Reveal({
  as: Tag = 'div',
  anim = 'slide-up',
  duration = 1000,
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const [ref, inView] = useInView({ threshold: 0.15, once: true })

  return (
    <Tag
      ref={ref}
      className={cx(className, inView && 'sal-animate')}
      data-sal={anim}
      data-sal-duration={duration}
      data-sal-delay={delay}
      {...rest}
    >
      {children}
    </Tag>
  )
}
