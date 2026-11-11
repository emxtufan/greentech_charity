import { useEffect, useRef, useState } from 'react'

let scriptPromise
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    const timer = window.setTimeout(() => fail(), 20000)
    const fail = () => {
      window.clearTimeout(timer)
      script.remove()
      scriptPromise = undefined
      reject(new Error('Verificarea nu s-a încărcat. Verifică conexiunea și reîncearcă.'))
    }
    script.onload = () => {
      window.clearTimeout(timer)
      if (window.turnstile) resolve(window.turnstile)
      else fail()
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return scriptPromise
}

export default function Turnstile({ siteKey, resetKey, onToken }) {
  const container = useRef(null)
  const callback = useRef(onToken)
  callback.current = onToken
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [size, setSize] = useState('flexible')

  useEffect(() => {
    const element = container.current
    const measure = () => setSize(element.clientWidth < 300 ? 'compact' : 'flexible')
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let disposed = false
    let widget
    let api
    callback.current('')
    setError('')
    loadTurnstile().then((loaded) => {
      if (disposed) return
      api = loaded
      widget = api.render(container.current, {
        sitekey: siteKey, action: 'contact', theme: 'light', size, language: 'ro', appearance: 'always',
        callback: (token) => { if (!disposed) { setError(''); callback.current(token) } },
        'expired-callback': () => { if (!disposed) { callback.current(''); api.reset(widget) } },
        'error-callback': () => {
          if (!disposed) { callback.current(''); setError('Verificarea nu a reușit. Reîncearcă.') }
        },
      })
    }).catch((cause) => { if (!disposed) setError(cause.message) })
    return () => {
      disposed = true
      if (api && widget !== undefined) api.remove(widget)
    }
  }, [siteKey, resetKey, attempt, size])

  return <div className="mt-3">
    <div ref={container} style={{ minHeight: size === 'compact' ? 140 : 65 }} />
    {error && <div role="alert" className="gt-error mt-2">{error}{' '}<button type="button" className="btn btn-link p-0" onClick={() => setAttempt((value) => value + 1)}>Reîncearcă verificarea</button></div>}
  </div>
}
