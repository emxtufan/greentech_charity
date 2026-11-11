import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useContent from '../../hooks/useContent'
import { getConsent } from '../../utils/consent'
import { normalizeTracking, TRACKING_FIELDS } from '../../../shared/tracking'

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
  if (gtagId) appendScript('gt-gtag-js', gtagSrc)

  window.dataLayer = window.dataLayer || []

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
  }

  if (!window.__gtGtagInit) {
    window.__gtGtagInit = true
    window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    window.gtag('js', new Date())
  }
}

function loadGa(googleId) {
  if (window.__gtGaLoaded === googleId) return

  if (window.__gtGaLoaded) window[`ga-disable-${window.__gtGaLoaded}`] = true
  window.__gtGaLoaded = googleId
  ensureGtag(googleId)
  window.gtag('config', googleId, { send_page_view: false, page_location: `${window.location.origin}${window.location.pathname}` })
}

function loadGtm(containerId) {
  if (window.__gtGtmLoaded) return

  window.__gtGtmLoaded = containerId
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })

  const gtmSrc = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  appendScript('gt-gtm-js', gtmSrc)
}

function loadAw(awId) {
  if (window.__gtAwLoaded === awId) return

  window.__gtAwLoaded = awId
  ensureGtag(awId)
  window.gtag('config', awId, { send_page_view: false, page_location: `${window.location.origin}${window.location.pathname}` })
}

function loadFacebook(pixelId) {
  if (window.__gtFbLoaded === pixelId) return

  window.__gtFbLoaded = pixelId

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

  window.fbq('set', 'autoConfig', false, pixelId)
  window.fbq('init', pixelId)
}

function loadTiktok(pixelId) {
  if (window.__gtTtLoaded === pixelId) return
  if (window.__gtTtLoaded && window.ttq?.load) {
    window.ttq.load(pixelId)
    window.__gtTtLoaded = pixelId
    return
  }

  window.__gtTtLoaded = pixelId

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
    'holdConsent',
    'revokeConsent',
    'grantConsent',
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
}

function loadClarity(id) {
  if (window.__gtClarityLoaded) return
  window.__gtClarityLoaded = id
  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments)
  }
  appendScript('gt-clarity-js', 'https://www.clarity.ms/tag/' + encodeURIComponent(id))
}

export default function TrackingLoader() {
  const { content } = useContent()
  const location = useLocation()
  const lastPage = useRef({})
  const leadIds = useRef(new Set())
  const [consent, setConsent] = useState(getConsent)
  const tracking = normalizeTracking(content?.site?.tracking)
  for (const { key, pattern } of TRACKING_FIELDS) {
    if (!pattern.test(tracking[key])) tracking[key] = ''
  }
  const { ga4Id, gtmId, googleAdsId, googleAdsConversionLabel, facebookPixelId, tiktokPixelId, clarityId } = tracking

  useEffect(() => {
    const onConsent = () => setConsent(getConsent())
    window.addEventListener('gt-consent', onConsent)
    return () => {
      window.removeEventListener('gt-consent', onConsent)
      if (window.__gtGaLoaded) window['ga-disable-' + window.__gtGaLoaded] = true
      window.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
      window.fbq?.('consent', 'revoke')
      window.ttq?.revokeConsent?.()
      window.clarity?.('stop')
    }
  }, [])

  useEffect(() => {
    const analytics = consent?.analytics === true
    const marketing = consent?.marketing === true
    const googleTag = (analytics && ga4Id) || (marketing && googleAdsId)
    if (googleTag || ((analytics || marketing) && gtmId)) ensureGtag(googleTag || undefined)
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: marketing ? 'granted' : 'denied',
        ad_user_data: marketing ? 'granted' : 'denied',
        ad_personalization: marketing ? 'granted' : 'denied',
      })
    }
    if (window.__gtGaLoaded) window['ga-disable-' + window.__gtGaLoaded] = !analytics || ga4Id !== window.__gtGaLoaded
    if (ga4Id) window['ga-disable-' + ga4Id] = !analytics
    if (analytics && ga4Id) loadGa(ga4Id)
    if ((analytics || marketing) && gtmId) loadGtm(gtmId)
    if (marketing && googleAdsId) loadAw(googleAdsId)
    if (marketing && facebookPixelId) loadFacebook(facebookPixelId)
    if (marketing && tiktokPixelId) loadTiktok(tiktokPixelId)
    if (analytics && clarityId) loadClarity(clarityId)
    if (window.fbq) window.fbq('consent', marketing && facebookPixelId ? 'grant' : 'revoke')
    if (window.ttq) window.ttq[marketing && tiktokPixelId ? 'grantConsent' : 'revokeConsent']?.()
    if (window.clarity) window.clarity('consentv2', {
      analytics_Storage: analytics && clarityId ? 'granted' : 'denied',
      ad_Storage: marketing && clarityId ? 'granted' : 'denied',
    })
    if (window.clarity) window.clarity(analytics && clarityId ? 'start' : 'stop')

    const page = { page_path: location.pathname, page_location: window.location.origin + location.pathname, page_title: document.title }
    const sendPage = (key, enabled, id, send) => {
      if (!enabled || !id) {
        delete lastPage.current[key]
        return
      }
      const marker = id + ':' + page.page_path
      if (lastPage.current[key] === marker) return
      lastPage.current[key] = marker
      send()
    }
    sendPage('ga', analytics, ga4Id, () => window.gtag('event', 'page_view', { ...page, send_to: ga4Id }))
    sendPage('ads', marketing, googleAdsId, () => window.gtag('event', 'page_view', { ...page, send_to: googleAdsId }))
    sendPage('meta', marketing, facebookPixelId, () => window.fbq('trackSingle', facebookPixelId, 'PageView'))
    sendPage('tiktok', marketing, tiktokPixelId, () => window.ttq.page())
    sendPage('gtm', analytics || marketing, gtmId, () => window.dataLayer.push({ event: 'virtual_page_view', ...page }))

    const onContact = (event) => {
      const id = event.detail?.id
      if (!id || leadIds.current.has(id)) return
      leadIds.current.add(id)
      if (analytics && ga4Id) window.gtag('event', 'generate_lead', { send_to: ga4Id, form_id: 'contact' })
      if (marketing && googleAdsId && googleAdsConversionLabel) {
        window.gtag('event', 'conversion', { send_to: googleAdsId + '/' + googleAdsConversionLabel, transaction_id: id })
      }
      if (marketing && facebookPixelId) window.fbq('trackSingle', facebookPixelId, 'Lead', {}, { eventID: id })
      if (marketing && tiktokPixelId) window.ttq.track('SubmitForm', {}, { event_id: id })
      if (analytics && clarityId) window.clarity('event', 'contact_sent')
      if ((analytics || marketing) && gtmId) window.dataLayer.push({ event: 'generate_lead', form_id: 'contact', event_id: id })
    }
    window.addEventListener('gt-contact-sent', onContact)
    return () => window.removeEventListener('gt-contact-sent', onContact)
  }, [consent, ga4Id, gtmId, googleAdsId, googleAdsConversionLabel, facebookPixelId, tiktokPixelId, clarityId, location.pathname])

  return null
}
