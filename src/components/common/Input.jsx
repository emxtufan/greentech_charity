import { forwardRef } from 'react'
import { cx } from '../../utils/helpers'

const Input = forwardRef(function Input(
  { label, name, type = 'text', error, id, className = '', ...rest },
  ref
) {
  const inputId = id || name

  return (
    <div className="mb-3">
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        className={cx('form-control', error && 'is-invalid', className)}
        {...rest}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  )
})

export default Input
