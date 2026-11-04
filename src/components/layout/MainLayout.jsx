import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import TrackingLoader from '../site/TrackingLoader'
import CookieConsent from '../site/CookieConsent'
import SiteModals from '../site/SiteModals'
import useScrollPosition from '../../hooks/useScrollPosition'
import { img } from '../../utils/helpers'

let preloaderShown = false

const PRELOADER_LETTERS = ['G', 'R', 'E', 'E', 'N', 'T', 'E', 'C', 'H']

export default function MainLayout() {
  const [showPreloader, setShowPreloader] = useState(() => !preloaderShown)
  const location = useLocation()
  const scrollY = useScrollPosition()

  useEffect(() => {
    if (!preloaderShown) preloaderShown = true

    const timer = setTimeout(() => setShowPreloader(false), 800)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

      return () => clearTimeout(timer)
    }

    window.scrollTo(0, 0)
    return undefined
  }, [location.pathname, location.hash])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="main-page-wrapper">
      {showPreloader && (
        <div id="preloader">
          <div id="ctn-preloader" className="ctn-preloader">
            <div className="icon">
              <img src={img('logo-icon.png')} alt="" className="m-auto d-block" /> <span></span>
            </div>
            <div className="txt-loading">
              {PRELOADER_LETTERS.map((letter, index) => (
                <span
                  data-text-preloader={letter}
                  className="letters-loading"
                  key={`${letter}-${index}`}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Navbar />

      <main>
        <Outlet />
      </main>

      <Footer />

      {scrollY > 300 && (
        <button className="scroll-top" onClick={scrollTop}>
          <i className="bi bi-arrow-up-short"></i>
        </button>
      )}

      <TrackingLoader />

      <CookieConsent />
      <SiteModals />
    </div>
  )
}
