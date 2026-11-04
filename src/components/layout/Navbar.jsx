import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import useScrollPosition from '../../hooks/useScrollPosition'
import { cx, img } from '../../utils/helpers'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/#about' },
  { label: 'Causes', to: '/#causes' },
  { label: 'Events', to: '/#events' },
  { label: 'Blog', to: '/#blog' },
  { label: 'Contact', to: '/#contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollY = useScrollPosition()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  const closeMenu = () => setOpen(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header
      className={cx(
        'theme-main-menu menu-style-one menu-overlay sticky-menu',
        scrollY > 100 && 'fixed'
      )}
    >
      <div className="inner-content">
        <div className="bottom-header gap-one position-relative">
          <div className="d-flex align-items-center">
            <div className="logo order-lg-0">
              <Link to="/" className="d-flex align-items-center">
                <img
                  src={img('logo-horizontal-light.png')}
                  alt="Greentech Charity"
                  className="logo-img"
                />
              </Link>
            </div>
            {/* logo */}
            <div className="right-widget ms-auto me-3 me-lg-0 order-lg-3">
              <ul className="d-flex align-items-center style-none">
                <li className="d-none d-xxl-block me-3">
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="cta-text font-amita text-white"
                  >
                    {isAuthenticated ? 'Dashboard' : 'Login'}
                  </Link>
                </li>
                <li className="me-3 d-none d-md-block">
                  {isAuthenticated ? (
                    <button type="button" className="cta-btn-one" onClick={handleLogout}>
                      Logout
                    </button>
                  ) : (
                    <Link to="/register" className="cta-btn-one">
                      Become a Volunteer
                    </Link>
                  )}
                </li>
                <li className="d-none d-sm-block">
                  <form
                    className="search-form-one position-relative z-1"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <input type="text" placeholder="Search . . ." />
                    <button type="submit" className="tran3s rounded-circle">
                      <i className="fa-regular fa-search"></i>
                    </button>
                  </form>
                </li>
              </ul>
            </div>
            <nav className="navbar navbar-expand-lg p0 order-lg-2">
              <button
                className={cx('navbar-toggler d-block d-lg-none', !open && 'collapsed')}
                type="button"
                aria-controls="navbarNav"
                aria-expanded={open}
                aria-label="Toggle navigation"
                onClick={() => setOpen((previous) => !previous)}
              >
                <span></span>
              </button>
              <div className={cx('navbar-collapse collapse', open && 'show')} id="navbarNav">
                <ul className="navbar-nav align-items-lg-center">
                  <li className="d-block d-lg-none">
                    <div className="logo">
                      <Link to="/" className="d-block" onClick={closeMenu}>
                        <img
                          src={img('logo-horizontal-light.png')}
                          alt="Greentech Charity"
                          className="logo-img"
                        />
                      </Link>
                    </div>
                  </li>
                  {NAV_LINKS.map((link) => (
                    <li className="nav-item" key={link.label}>
                      <NavLink className="nav-link" to={link.to} onClick={closeMenu}>
                        {link.label}
                      </NavLink>
                    </li>
                  ))}
                  <li className="d-md-none ps-3 pe-3 mt-20">
                    <Link to="/register" className="cta-btn-one w-100" onClick={closeMenu}>
                      Become a Volunteer
                    </Link>
                  </li>
                  <li className="d-sm-none ps-3 pe-3 mt-20">
                    <form
                      className="search-form-one position-relative z-1"
                      onSubmit={(event) => event.preventDefault()}
                    >
                      <input type="text" placeholder="Search . . ." />
                      <button type="submit" className="tran3s rounded-circle">
                        <i className="fa-regular fa-search"></i>
                      </button>
                    </form>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </div>{' '}
        {/*/.bottom-header*/}
      </div>{' '}
      {/* /.inner-content */}
    </header>
  )
}
