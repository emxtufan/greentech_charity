import useCountUp from '../../hooks/useCountUp'
import useInView from '../../hooks/useInView'
import { cx, formatNumber } from '../../utils/helpers'

export default function Counter({
  end = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 2000,
  className = '',
  ...rest
}) {
  const [ref, inView] = useInView({ threshold: 0.15, once: true })
  const value = useCountUp(end, { duration, start: inView })

  const shown =
    decimals > 0
      ? Number(value).toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : formatNumber(Math.round(value))

  return (
    <span ref={ref} className={cx('counter', className)} {...rest}>
      {prefix}
      {shown}
      {suffix}
    </span>
  )
}
