import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useContent from '../../hooks/useContent'
import { getConsent } from '../../utils/consent'

const GA_ID_PATTERN = /^G-[A-Z0-9]+$/
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/
const AW_ID_PATTERN = /^AW-\d+$/
const FACEBOOK_ID_PATTERN = /^\d+$/
const TIKTOK_ID_PATTERN = /^[A-Z0-9]+$/

function appendScript(scriptId, src) {
  if (document.getElementById(scriptId)) return

  const script = document.createElement('script')
  script.id = scriptId
  script.async = true
  script.src = src

  document.head.appendChild(script)
}

function ensureGtag(gtagId) {
  const gtagSrc = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`
  appendScript('gt-gtag-js', gtagSrc)

  window.dataLayer = window.dataLayer || []

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }

  if (!window.__gtGtagInit) {
    window.__gtGtagInit = true
    window.gtag('js', new Date())
  }
}

function loadGa(googleId) {
  if (window.__gtGaLoaded) return

  window.__gtGaLoaded = true
  ensureGtag(googleId)
  window.gtag('config', googleId, { anonymize_ip: true })
}

function loadGtm(containerId) {
  if (window.__gtGtmLoaded) return

  window.__gtGtmLoaded = true
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

  const gtmSrc = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  appendScript('gt-gtm-js', gtmSrc)
}

function loadAw(awId) {
  if (window.__gtAwLoaded) return

  window.__gtAwLoaded = true
  ensureGtag(awId)
  window.gtag('config', awId)
}

function loadFacebook(pixelId) {
  if (window.__gtFbLoaded) return

  window.__gtFbLoaded = true

  if (typeof window.fbq !== 'function') {
    const fbq = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments)
      } else {
        fbq.queue.push(arguments)
      }
    }

    fbq.queue = []
    fbq.loaded = true
    fbq.version = '2.0'
    window.fbq = fbq
    window._fbq = fbq

    appendScript('gt-fbevents-js', 'https://connect.facebook.net/en_US/fbevents.js')
  }

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')
}

function loadTiktok(pixelId) {
  if (window.__gtTtLoaded) return

  window.__gtTtLoaded = true

  const analytics = window.ttq || []
  const methods = [
    'page',
    'track',
    'identify',
    'instances',
    'debug',
    'on',
    'off',
    'once',
    'ready',
    'alias',
    'group',
    'enableCookie',
    'disableCookie',
  ]

  window.TiktokAnalyticsObject = 'ttq'
  window.ttq = analytics

  analytics.methods = methods
  analytics.setAndDefer = function (target, method) {
    target[method] = function () {
      target.push([method].concat(Array.prototype.slice.call(arguments, 0)))
    }
  }
  methods.forEach((method) => analytics.setAndDefer(analytics, method))

  analytics.instance = function (id) {
    const instance = analytics._i[id] || []
    methods.forEach((method) => analytics.setAndDefer(instance, method))
    return instance
  }

  analytics.load = function (id) {
    const src = 'https://analytics.tiktok.com/i18n/pixel/events.js'

    analytics._i = analytics._i || {}
    analytics._i[id] = []
    analytics._i[id]._u = src
    analytics._t = analytics._t || {}
    analytics._t[id] = +new Date()
    analytics._o = analytics._o || {}
    analytics._o[id] = {}

    appendScript('gt-tiktok-js', `${src}?sdkid=${encodeURIComponent(id)}&lib=ttq`)
  }

  analytics.load(pixelId)
  analytics.page()
}

export default function TrackingLoader() {
  const { content } = useContent()
  const location = useLocation()
  const firstRoute = useRef(true)
  const [consent, setConsent] = useState(getConsent)

  const tracking = content?.site?.tracking || {}
  const googleId = typeof tracking.googleId === 'string' ? tracking.googleId.trim() : ''
  const facebookPixelId =
    typeof tracking.facebookPixelId === 'string' ? tracking.facebookPixelId.trim() : ''
  const tiktokPixelId =
    typeof tracking.tiktokPixelId === 'string' ? tracking.tiktokPixelId.trim() : ''

  useEffect(() => {
    setConsent(getConsent())

    const onConsent = () => setConsent(getConsent())

    window.addEventListener('gt-consent', onConsent)

    return () => window.removeEventListener('gt-consent', onConsent)
  }, [])

  useEffect(() => {
    if (!consent) return

    if (consent.analytics && googleId) {
      if (GA_ID_PATTERN.test(googleId)) loadGa(googleId)
      else if (GTM_ID_PATTERN.test(googleId)) loadGtm(googleId)
    }

    if (consent.marketing) {
      if (googleId && AW_ID_PATTERN.test(googleId)) loadAw(googleId)
      if (facebookPixelId && FACEBOOK_ID_PATTERN.test(facebookPixelId)) loadFacebook(facebookPixelId)
      if (tiktokPixelId && TIKTOK_ID_PATTERN.test(tiktokPixelId)) loadTiktok(tiktokPixelId)
    }
  }, [consent, googleId, facebookPixelId, tiktokPixelId])

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }

    const pagePath = `${location.pathname}${location.search}`

    if ((window.__gtGaLoaded || window.__gtAwLoaded) && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pagePath })
    }

    if (window.__gtFbLoaded && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }

    if (window.__gtTtLoaded && window.ttq && typeof window.ttq.page === 'function') {
      window.ttq.page()
    }
  }, [location.pathname, location.search])

  return null
}
