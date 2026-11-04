import { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import { deleteMessage, listMessages } from '../../services/messageService'

const TOPIC_LABELS = {
  situatie: 'O situație',
  companie: 'Companie',
  materiale: 'Materiale sau servicii',
  voluntariat: 'Voluntariat',
  formular230: 'Formularul 230',
  altceva: 'Altceva',
}

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ro-RO')
}

export function MessagesView() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    listMessages()
      .then((data) => {
        if (active) setMessages(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!active) return
        setMessages([])
        setError(err.message || 'Mesajele nu au putut fi încărcate.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleDelete = async (message) => {
    if (!window.confirm('Ștergi acest mesaj?')) return

    setError('')

    try {
      await deleteMessage(message.id)
      setMessages((prev) => prev.filter((item) => item.id !== message.id))
    } catch (err) {
      setError(err.message || 'Mesajul nu a putut fi șters.')
    }
  }

  return (
    <>
      {error && <p className="text-danger">{error}</p>}
      {loading && <p>Se încarcă…</p>}
      {!loading && messages.length === 0 && <p>Nu ai mesaje.</p>}

      {!loading && messages.length > 0 && (
        <ul className="list-unstyled mb-0">
          {messages.map((message) => (
            <li key={message.id} className="border-bottom pb-3 mb-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div className="small">
                  <div className="text-muted">{formatDate(message.createdAt)}</div>
                  <div className="fw-bold">{TOPIC_LABELS[message.topic] || message.topic}</div>
                  <div>{message.name}</div>
                  <div>
                    <a href={`mailto:${message.email}`}>{message.email}</a>
                  </div>
                  {message.phone && <div>{message.phone}</div>}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDelete(message)}
                >
                  Șterge
                </button>
              </div>
              <p className="mb-0 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                {message.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function MessagesPanel({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Mesaje">
      {open && <MessagesView />}
    </Modal>
  )
}
