import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useScrollPosition from '../../hooks/useScrollPosition'
import { cx } from '../../utils/helpers'
import {
  AddItemButton,
  EditableImage,
  EditableLink,
  ListItem,
  Scope,
  useField,
} from '../editable'

export const defaultSite = {
  nav: [
    { label: 'Acasă', to: '/' },
    { label: 'Povestea noastră', to: '/#poveste' },
    { label: 'Case modulare', to: '/case-modulare' },
    { label: 'Cum poți ajuta', to: '/#cum-ajuti' },
    { label: 'Proiecte', to: '/proiecte' },
    { label: 'Contact', to: '/contact' },
  ],
  header: {
    logo: 'logo-horizontal-light.png',
    cta: { label: 'Redirecționează 3,5%', to: '/formular-230' },
  },
}

export default function Navbar() {
  return (
    <Scope path={['site']}>
      <NavbarContent />
    </Scope>
  )
}

function NavbarContent() {
  const { value: nav = [] } = useField('nav')
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const scrollY = useScrollPosition()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  const closeMenu = () => setOpen(false)

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
                <EditableImage
                  field="header.logo"
                  alt="GreenTech Charity"
                  className="logo-img"
                />
              </Link>
            </div>
            {/* logo */}
            <div className="right-widget ms-auto me-3 me-lg-0 order-lg-3">
              <ul className="d-flex align-items-center style-none">
                <li className="me-3 d-none d-md-block">
                  <EditableLink field="header.cta" className="cta-btn-one" />
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
                        <EditableImage
                          field="header.logo"
                          alt="GreenTech Charity"
                          className="logo-img"
                        />
                      </Link>
                    </div>
                  </li>
                  {nav.map((link, index) => (
                    <ListItem key={index} field="nav" index={index}>
                      <li className="nav-item" onClick={closeMenu}>
                        <EditableLink className="nav-link" />
                      </li>
                    </ListItem>
                  ))}
                  <li className="d-md-none ps-3 pe-3 mt-20">
                    <EditableLink
                      field="header.cta"
                      className="cta-btn-one w-100"
                      onClick={closeMenu}
                    />
                  </li>
                </ul>
                <div className="d-none d-lg-block">
                  <AddItemButton field="nav" />
                </div>
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
