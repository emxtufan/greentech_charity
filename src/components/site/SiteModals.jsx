import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../common/Modal'
import useContent from '../../hooks/useContent'

const GDPR_HASH = '#informare-gdpr'
const ANAF_HASH = '#informatii-anaf'
const MODAL_IDS = ['gdpr', 'anaf']

function paragraphs(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>)
}

export default function SiteModals() {
  const { content } = useContent()
  const [openModal, setOpenModal] = useState(null)

  useEffect(() => {
    const handleClick = (event) => {
      const anchor = event.target?.closest?.('a')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''

      if (href.endsWith(GDPR_HASH)) {
        event.preventDefault()
        setOpenModal('gdpr')
      } else if (href.endsWith(ANAF_HASH)) {
        event.preventDefault()
        setOpenModal('anaf')
      }
    }

    const handleOpen = (event) => {
      if (!MODAL_IDS.includes(event.detail)) return

      setOpenModal(event.detail)
    }

    document.addEventListener('click', handleClick, true)
    window.addEventListener('gt-open-modal', handleOpen)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('gt-open-modal', handleOpen)
    }
  }, [])

  const modals = content?.site?.modals || {}
  const gdpr = modals.gdpr || {}
  const anaf = modals.anaf || {}

  const close = () => setOpenModal(null)

  return (
    <>
      <Modal
        open={openModal === 'gdpr'}
        onClose={close}
        title={gdpr.title}
        footer={
          <>
            {gdpr.linkLabel && (
              <Link to="/confidentialitate" onClick={close}>
                {gdpr.linkLabel}
              </Link>
            )}
            <button type="button" className="btn-one" onClick={close}>
              {gdpr.closeLabel || 'Închide'}
            </button>
          </>
        }
      >
        <div className="gt-modal-text">{paragraphs(gdpr.text)}</div>
      </Modal>

      <Modal
        open={openModal === 'anaf'}
        onClose={close}
        title={anaf.title}
        footer={
          <>
            {anaf.linkUrl && anaf.linkLabel && (
              <a href={anaf.linkUrl} target="_blank" rel="noopener noreferrer">
                {anaf.linkLabel}
              </a>
            )}
            <button type="button" className="btn-one" onClick={close}>
              {anaf.closeLabel || 'Închide'}
            </button>
          </>
        }
      >
        <div className="gt-modal-text">{paragraphs(anaf.text)}</div>
      </Modal>
    </>
  )
}
