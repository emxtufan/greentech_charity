import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../utils/helpers'

export default function Modal({ open, onClose, title, children, footer, className = '' }) {
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose?.()
  }

  return createPortal(
    <div className="app-modal-overlay" onClick={handleOverlayClick}>
      <div className={cx('app-modal', className)} role="dialog" aria-modal="true">
        <div className="app-modal-header">
          <h5 className="app-modal-title">{title}</h5>
          <button type="button" className="app-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
        {footer && <div className="app-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
