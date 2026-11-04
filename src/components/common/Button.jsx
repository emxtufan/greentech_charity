import { Link } from 'react-router-dom'
import { cx } from '../../utils/helpers'

export default function Button({
  variant = 'one',
  size = '',
  to,
  href,
  onClick,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = cx(`btn-${variant}`, size, className)

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...rest}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...rest}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}
