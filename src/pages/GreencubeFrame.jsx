import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import useContent from '../hooks/useContent'

async function prepareWebsite(container) {
  const images = Array.from(container.querySelectorAll('img'))
  images.forEach((image) => {
    image.loading = 'eager'
  })

  const backgrounds = new Set()
  container.querySelectorAll('*').forEach((element) => {
    const background = getComputedStyle(element).backgroundImage
    for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      backgrounds.add(match[1])
    }
  })
  backgrounds.forEach((src) => {
    const image = new Image()
    image.src = src
    images.push(image)
  })

  await Promise.all([
    document.fonts.ready,
    ...images.filter((image) => image.currentSrc || image.src).map((image) => image.decode()),
  ])
}

export default function GreencubeFrame() {
  const location = useLocation()
  const navigate = useNavigate()
  const { content, loading, error } = useContent()
  const showScene = location.pathname === '/' && !location.hash
  const frame = useRef(null)
  const website = useRef(null)
  const wasShowingScene = useRef(showScene)
  const transitionStarted = useRef(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [websiteReady, setWebsiteReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneVisible, setSceneVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [websiteFailure, setWebsiteFailure] = useState('')
  const [sceneFailure, setSceneFailure] = useState('')
  const failure = websiteFailure || sceneFailure
  const websiteVisible = !showScene || isTransitioning

  const finishTransition = useCallback(() => {
    if (!transitionStarted.current) return
    transitionStarted.current = false
    setIsTransitioning(false)
    navigate('/website')
  }, [navigate])

  useEffect(() => {
    if (!isTransitioning || !showScene) return undefined

    // Încheie trecerea și dacă browserul nu emite transitionend.
    const timer = window.setTimeout(finishTransition, 1200)
    return () => window.clearTimeout(timer)
  }, [isTransitioning, showScene, finishTransition])

  useEffect(() => {
    if (!showScene) {
      transitionStarted.current = false
      setIsTransitioning(false)
      setSceneReady(false)
      setSceneVisible(false)
      setProgress(0)
      setWebsiteReady(false)
      setWebsiteFailure('')
      setSceneFailure('')
      if (wasShowingScene.current) website.current?.focus({ preventScroll: true })
    }
    wasShowingScene.current = showScene
    if (!showScene) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [showScene])

  useEffect(() => {
    if (!showScene || loading) return undefined
    setWebsiteReady(false)
    setWebsiteFailure('')
    if (error || !content) {
      setWebsiteFailure('Conținutul site-ului nu a putut fi încărcat.')
      return undefined
    }

    let cancelled = false
    const animationFrame = requestAnimationFrame(() => {
      prepareWebsite(website.current).then(() => {
        if (!cancelled) setWebsiteReady(true)
      }).catch((cause) => {
        console.error('[WebCharity] Pregătirea paginii a eșuat.', cause)
        if (!cancelled) setWebsiteFailure('Unele imagini ale site-ului nu au putut fi încărcate.')
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)
    }
  }, [showScene, content, loading, error])

  useEffect(() => {
    if (!showScene) return undefined
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return
      if (event.data?.source !== 'greencube') return
      switch (event.data.type) {
        case 'progress': {
          const value = Number(event.data.progress)
          if (Number.isFinite(value)) setProgress((previous) => Math.max(previous, Math.min(95, value * 95)))
          break
        }
        case 'ready':
          setSceneFailure('')
          setSceneReady(true)
          setProgress(98)
          break
        case 'visible':
          setProgress(100)
          setSceneVisible(true)
          break
        case 'failed':
          setSceneFailure('Scena 3D nu a putut fi încărcată.')
          break
        case 'explore':
          if (websiteReady && sceneVisible && !transitionStarted.current) {
            transitionStarted.current = true
            setIsTransitioning(true)
          }
          break
        default:
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [showScene, websiteReady, sceneVisible])

  useEffect(() => {
    if (showScene && sceneReady && websiteReady && !failure) {
      frame.current?.contentWindow?.postMessage({ source: 'webcharity', type: 'start' }, window.location.origin)
    }
  }, [showScene, sceneReady, websiteReady, failure])

  return (
    <>
      <div
        ref={website}
        className="gc-website"
        data-webcharity-page
        data-entering={isTransitioning}
        tabIndex={-1}
        inert={showScene ? '' : undefined}
        aria-hidden={showScene || undefined}
        style={{ visibility: websiteVisible ? 'visible' : 'hidden', outline: 'none' }}
      >
        <MainLayout skipPreloader={showScene} active={websiteVisible} />
      </div>
      {showScene && (
        <div
          className={`gc-scene-shell${isTransitioning ? ' is-leaving' : ''}`}
          inert={isTransitioning ? '' : undefined}
          aria-hidden={isTransitioning || undefined}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === 'opacity') {
              finishTransition()
            }
          }}
        >
          <iframe
            ref={frame}
            src="/greencube/index.html?entry=webcharity"
            title="Animația caselor GreenTech Charity"
            onLoad={() => frame.current?.contentWindow?.postMessage({ source: 'webcharity', type: 'status' }, window.location.origin)}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
          <div
            className={`gc-entry-loader${sceneVisible ? ' is-ready' : ''}`}
            role="status"
            aria-live="polite"
            aria-hidden={sceneVisible}
          >
            <div className="gc-entry-loader-content">
              <p>{failure || (sceneReady ? 'Pregătim experiența' : 'Încărcăm casele')}</p>
              {!failure && (
                <>
                  <strong>{Math.round(progress)}%</strong>
                  <progress aria-label="Încărcarea experienței" max="100" value={progress} />
                </>
              )}
              {failure && <button onClick={() => window.location.reload()}>Reîncearcă</button>}
            </div>
          </div>
        </div>
      )}
      <style>{`
        .gc-entry-loader { position: absolute; inset: 0; display: grid; place-items: center; background: #efede0; color: #1f3a27; transition: opacity 180ms ease, visibility 180ms; }
        .gc-entry-loader.is-ready { opacity: 0; visibility: hidden; pointer-events: none; }
        .gc-entry-loader-content { width: min(320px, 80vw); text-align: center; }
        .gc-entry-loader p { margin: 0 0 16px; color: inherit; }
        .gc-entry-loader strong { display: block; font-size: 48px; font-variant-numeric: tabular-nums; }
        .gc-entry-loader progress { display: block; width: 100%; height: 4px; margin-top: 24px; border: 0; accent-color: #1f3a27; background: #1f3a2720; }
        .gc-entry-loader progress::-webkit-progress-bar { background: #1f3a2720; }
        .gc-entry-loader progress::-webkit-progress-value { background: #1f3a27; }
        .gc-entry-loader button { padding: 12px 24px; border: 1px solid currentColor; color: inherit; background: transparent; border-radius: 24px; }
      `}</style>
    </>
  )
}
