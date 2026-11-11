import { useEffect, useState } from 'react'
import { getIntegrations, saveIntegrations, testSmtp } from '../../../services/integrationService'

const SMTP_FIELDS = [
  ['host', 'Server SMTP', 'text'], ['port', 'Port', 'number'],
  ['user', 'Utilizator SMTP', 'text'], ['fromName', 'Numele expeditorului', 'text'],
  ['fromEmail', 'Email expeditor', 'email'], ['to', 'Emailurile echipei, separate prin virgulă', 'text'],
]

export default function IntegrationSettings() {
  const [settings, setSettings] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [testRecipient, setTestRecipient] = useState('')

  useEffect(() => {
    let active = true
    getIntegrations().then((result) => {
      if (!active) return
      setSettings(result)
      setTestRecipient(result.smtp.fromEmail)
    }).catch((cause) => { if (active) setError(cause.message) })
    return () => { active = false }
  }, [])

  const change = (section, key, value) => {
    setSettings((previous) => ({ ...previous, [section]: { ...previous[section], [key]: value } }))
    setDirty(true)
    setNotice('')
  }

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await saveIntegrations(settings)
      setSettings(result)
      setDirty(false)
      setNotice('Setările au fost salvate.')
    } catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }

  const checkSmtp = async (send) => {
    setBusy(true)
    setError('')
    setNotice('')
    try { setNotice((await testSmtp({ send, to: testRecipient })).message) }
    catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }

  if (!settings) return <p role="status">{error || 'Se încarcă setările…'}</p>
  return (
    <form onSubmit={save}>
      <fieldset disabled={busy}>
        <div className="gt-admin-card">
          <h2 className="h5">Trimitere emailuri</h2>
          <label className="form-check mb-3">
            <input className="form-check-input" type="checkbox" checked={settings.smtp.enabled} onChange={(event) => change('smtp', 'enabled', event.target.checked)} />
            <span className="form-check-label">Activează SMTP</span>
          </label>
          <div className="row g-3">
            {SMTP_FIELDS.map(([key, label, type]) => (
              <div className="col-md-6" key={key}>
                <label className="form-label" htmlFor={`smtp-${key}`}>{label}</label>
                <input id={`smtp-${key}`} className="form-control" type={type} value={settings.smtp[key]} onChange={(event) => change('smtp', key, event.target.value)} />
              </div>
            ))}
            <div className="col-md-6">
              <label htmlFor="smtp-security" className="form-label">Securitatea conexiunii</label>
              <select id="smtp-security" className="form-select" value={settings.smtp.security} onChange={(event) => change('smtp', 'security', event.target.value)}>
                <option value="starttls">STARTTLS (de obicei portul 587)</option>
                <option value="tls">TLS (de obicei portul 465)</option>
                <option value="none">Fără TLS</option>
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="smtp-password" className="form-label">Parolă SMTP / parolă de aplicație</label>
              <input id="smtp-password" className="form-control" type="password" autoComplete="new-password" value={settings.smtp.password} placeholder={settings.smtp.hasPassword ? 'Parolă salvată — completează pentru înlocuire' : ''} onChange={(event) => change('smtp', 'password', event.target.value)} />
            </div>
          </div>
          <label className="form-check mt-4 mb-3">
            <input className="form-check-input" type="checkbox" checked={settings.smtp.autoReply} onChange={(event) => change('smtp', 'autoReply', event.target.checked)} />
            <span className="form-check-label">Trimite automat confirmarea către client</span>
          </label>
          <label className="form-label" htmlFor="smtp-subject">Subiectul confirmării</label>
          <input id="smtp-subject" className="form-control mb-3" value={settings.smtp.replySubject} onChange={(event) => change('smtp', 'replySubject', event.target.value)} />
          <label className="form-label" htmlFor="smtp-reply">Mesajul confirmării</label>
          <textarea id="smtp-reply" className="form-control" rows={7} value={settings.smtp.replyText} onChange={(event) => change('smtp', 'replyText', event.target.value)} />
          <p className="form-text">Poți folosi {'{name}'}, {'{reference}'} și {'{siteName}'}. Răspunsurile clientului ajung la adresa expeditorului.</p>
          <div className="d-flex gap-2 flex-wrap align-items-center mt-3">
            <button className="btn btn-outline-success" type="button" disabled={dirty || !settings.smtp.enabled} onClick={() => checkSmtp(false)}>Verifică conexiunea SMTP</button>
            <input className="form-control" style={{ maxWidth: 280 }} type="email" aria-label="Destinatar pentru emailul de test" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} />
            <button className="btn btn-outline-success" type="button" disabled={dirty || !settings.smtp.enabled || !testRecipient} onClick={() => checkSmtp(true)}>Trimite email de test</button>
          </div>
          {dirty && <p className="form-text">Salvează modificările pentru a testa configurația.</p>}
        </div>
        <div className="gt-admin-card">
          <h2 className="h5">Protecția formularului de contact</h2>
          <label className="form-label" htmlFor="turnstile-mode">Cloudflare Turnstile</label>
          <select id="turnstile-mode" className="form-select mb-3" value={settings.turnstile.mode} onChange={(event) => change('turnstile', 'mode', event.target.value)}>
            <option value="disabled">Dezactivat</option>
            <option value="test">Test local — cheile oficiale Cloudflare</option>
            <option value="live">Activ pe domeniul public</option>
          </select>
          {settings.turnstile.mode === 'test' && <p className="form-text">Modul de test funcționează pe localhost. Pentru publicare, selectează modul activ și completează cheile domeniului.</p>}
          {settings.turnstile.mode === 'live' && <>
            <label htmlFor="turnstile-siteKey" className="form-label">Site key</label>
            <input id="turnstile-siteKey" className="form-control mb-3" value={settings.turnstile.siteKey} onChange={(event) => change('turnstile', 'siteKey', event.target.value)} />
            <label htmlFor="turnstile-secretKey" className="form-label">Secret key</label>
            <input id="turnstile-secretKey" className="form-control mb-3" type="password" autoComplete="new-password" value={settings.turnstile.secretKey} placeholder={settings.turnstile.hasSecretKey ? 'Cheie salvată — completează pentru înlocuire' : ''} onChange={(event) => change('turnstile', 'secretKey', event.target.value)} />
            <label htmlFor="turnstile-hostnames" className="form-label">Domenii permise, separate prin virgulă</label>
            <input id="turnstile-hostnames" className="form-control mb-3" placeholder="exemplu.ro, www.exemplu.ro" value={settings.turnstile.hostnames} onChange={(event) => change('turnstile', 'hostnames', event.target.value)} />
          </>}
          <p className="form-text">În Cloudflare alege un widget Managed. Bifa apare după verificare, iar fiecare trimitere este validată și pe server.</p>
        </div>
        {error && <p className="text-danger" role="alert">{error}</p>}
        {notice && <p className="text-success" role="status">{notice}</p>}
        <button className="btn btn-success" type="submit">{busy ? 'Se procesează…' : 'Salvează setările'}</button>
      </fieldset>
    </form>
  )
}
