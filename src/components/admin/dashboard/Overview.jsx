import { useEffect, useState } from 'react'
import useContent from '../../../hooks/useContent'
import { listMessages } from '../../../services/messageService'
import { listForms } from '../../../services/f230AdminService'
import { getStatus } from '../../../services/f230Service'
import { listLogs } from '../../../services/adminLogsService'

const LOGS_LIMIT = 10

const formatDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ro-RO')
}

const asArray = (value) => (Array.isArray(value) ? value : [])

const errorOf = (result, fallback) => {
  if (result.status !== 'rejected') return ''
  return result.reason?.message || fallback
}

export default function Overview({ onNavigate }) {
  const { content } = useContent()

  const [messages, setMessages] = useState([])
  const [forms, setForms] = useState([])
  const [f230Enabled, setF230Enabled] = useState(false)
  const [logs, setLogs] = useState([])
  const [errors, setErrors] = useState({ messages: '', forms: '', status: '', logs: '' })

  useEffect(() => {
    let active = true

    Promise.allSettled([
      listMessages(),
      listForms(),
      getStatus(),
      listLogs({ limit: LOGS_LIMIT }),
    ]).then((results) => {
      if (!active) return

      const [messagesResult, formsResult, statusResult, logsResult] = results

      if (messagesResult.status === 'fulfilled') {
        setMessages(asArray(messagesResult.value))
      }

      if (formsResult.status === 'fulfilled') {
        setForms(asArray(formsResult.value))
      }

      if (statusResult.status === 'fulfilled') {
        setF230Enabled(Boolean(statusResult.value?.enabled))
      }

      if (logsResult.status === 'fulfilled') {
        setLogs(asArray(logsResult.value?.items))
      }

      setErrors({
        messages: errorOf(messagesResult, 'Mesajele nu au putut fi încărcate.'),
        forms: errorOf(formsResult, 'Formularele nu au putut fi încărcate.'),
        status: errorOf(statusResult, 'Starea formularului 230 nu a putut fi încărcată.'),
        logs: errorOf(logsResult, 'Activitatea recentă nu a putut fi încărcată.'),
      })
    })

    return () => {
      active = false
    }
  }, [])

  const legal = content?.site?.legal || {}
  const orgOk = Boolean(legal.name && legal.cif && legal.iban)
  const online = f230Enabled && orgOk

  const received = forms.filter((form) => form.status === 'primit').length
  const submitted = forms.filter((form) => form.status === 'depus').length

  const reasons = []

  if (!f230Enabled) reasons.push('Lipsește cheia de criptare')
  if (!orgOk) reasons.push('Lipsesc datele firmei (denumire, CIF, IBAN)')

  return (
    <div>
      <div className="row g-3">
        <div className="col-md-6 col-xl-3">
          <div className="gt-admin-card h-100">
            <small className="text-muted">Mesaje</small>
            <div className="gt-stat">{messages.length}</div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mt-2"
              onClick={() => onNavigate('mesaje')}
            >
              Vezi mesajele
            </button>
            {errors.messages && <p className="text-danger small mb-0 mt-2">{errors.messages}</p>}
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="gt-admin-card h-100">
            <small className="text-muted">Formulare 230 primite</small>
            <div className="gt-stat">{received}</div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mt-2"
              onClick={() => onNavigate('formulare')}
            >
              Vezi formularele
            </button>
            {errors.forms && <p className="text-danger small mb-0 mt-2">{errors.forms}</p>}
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="gt-admin-card h-100">
            <small className="text-muted">Formulare 230 depuse</small>
            <div className="gt-stat">{submitted}</div>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm mt-2"
              onClick={() => onNavigate('formulare')}
            >
              Vezi formularele
            </button>
            {errors.forms && <p className="text-danger small mb-0 mt-2">{errors.forms}</p>}
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="gt-admin-card h-100">
            <small className="text-muted">Formular 230 online</small>
            <div className="gt-stat">{online ? 'Activ' : 'Inactiv'}</div>
            {reasons.length > 0 && (
              <ul className="small mb-0 mt-2 ps-3">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            {!orgOk && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm mt-2"
                onClick={() => onNavigate('firma')}
              >
                Completează datele firmei
              </button>
            )}
            {errors.status && <p className="text-danger small mb-0 mt-2">{errors.status}</p>}
          </div>
        </div>
      </div>

      <div className="gt-admin-card mt-3">
        <h5 className="mb-3">Activitate recentă</h5>

        {logs.length > 0 && (
          <ul className="list-unstyled mb-0">
            {logs.map((log, index) => (
              <li key={log.id || index} className="py-1 border-bottom small">
                <span className="text-muted">{formatDate(log.ts)}</span> · {log.message}
              </li>
            ))}
          </ul>
        )}

        {logs.length === 0 && !errors.logs && <p className="mb-0">Nu există activitate încă.</p>}
        {errors.logs && <p className="text-danger small mb-0">{errors.logs}</p>}

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm mt-2"
          onClick={() => onNavigate('loguri')}
        >
          Toate logurile
        </button>
      </div>
    </div>
  )
}
