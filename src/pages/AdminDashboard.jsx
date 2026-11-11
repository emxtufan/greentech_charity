import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useContent from '../hooks/useContent'
import { img } from '../utils/helpers'
import { AdminLoginCard } from './AdminLogin'
import Overview from '../components/admin/dashboard/Overview'
import LogsView from '../components/admin/dashboard/LogsView'
import ModalsEditor from '../components/admin/dashboard/ModalsEditor'
import TrackingSettings from '../components/admin/dashboard/TrackingSettings'
import IntegrationSettings from '../components/admin/dashboard/IntegrationSettings'
import { MessagesView } from '../components/admin/MessagesPanel'
import { F230View } from '../components/admin/F230Panel'
import { OrgDataView } from '../components/admin/OrgDataPanel'

const TABS = [
  { key: 'prezentare', label: 'Prezentare', icon: 'bi-speedometer2' },
  { key: 'mesaje', label: 'Mesaje', icon: 'bi-envelope' },
  { key: 'formulare', label: 'Formulare 230', icon: 'bi-file-earmark-text' },
  { key: 'firma', label: 'Date asociație', icon: 'bi-building' },
  { key: 'modale', label: 'Modale', icon: 'bi-window' },
  { key: 'tracking', label: 'Tracking', icon: 'bi-graph-up' },
  { key: 'integrari', label: 'Email și Turnstile', icon: 'bi-shield-check' },
  { key: 'loguri', label: 'Loguri', icon: 'bi-journal-text' },
]

const DEFAULT_TAB = 'prezentare'

const isTab = (value) => TABS.some((item) => item.key === value)

export default function AdminDashboard() {
  const { isAdmin, setEditMode, adminLogout } = useContent()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab')
  const tab = isTab(rawTab) ? rawTab : DEFAULT_TAB
  const currentTab = TABS.find((item) => item.key === tab)

  useEffect(() => {
    document.title = 'Admin | GreenTech Charity'
  }, [])

  const setTab = (next) => {
    if (!isTab(next)) return

    setSearchParams({ tab: next })
  }

  const handleEditSite = () => {
    setEditMode(true)
    navigate('/')
  }

  if (!isAdmin) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="text-center mb-30">
            <img
              src={img('logo-full.png')}
              alt="Greentech Charity"
              className="d-block mx-auto"
              style={{ height: 90 }}
            />
          </div>

          <h3>Panou de administrare</h3>

          <AdminLoginCard />
        </div>
      </div>
    )
  }

  return (
    <div className="gt-admin">
      <aside className="gt-admin-sidebar">
        <div>
          <Link to="/" className="d-inline-block">
            <img
              src={img('logo-horizontal-light.png')}
              alt="Greentech Charity"
              style={{ height: 44 }}
            />
          </Link>
          <p>Panou de administrare</p>
        </div>

        <nav className="gt-admin-nav">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === tab ? 'active' : undefined}
              onClick={() => setTab(item.key)}
            >
              <i className={`bi ${item.icon}`} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="gt-admin-sidebar-footer">
          <button type="button" className="gt-admin-primary" onClick={handleEditSite}>
            Editează site-ul
          </button>
          <a href="/" target="_blank" rel="noopener">
            Vezi site-ul
          </a>
          <button type="button" onClick={adminLogout}>
            Ieșire
          </button>
        </div>
      </aside>

      <main className="gt-admin-main">
        <h1 className="gt-admin-title">{currentTab.label}</h1>

        {tab === 'prezentare' && <Overview onNavigate={setTab} />}

        {tab === 'mesaje' && (
          <div className="gt-admin-card">
            <MessagesView />
          </div>
        )}

        {tab === 'formulare' && (
          <div className="gt-admin-card">
            <F230View />
          </div>
        )}

        {tab === 'firma' && (
          <div className="gt-admin-card">
            <OrgDataView />
          </div>
        )}

        {tab === 'modale' && <ModalsEditor />}

        {tab === 'tracking' && <TrackingSettings />}
        {tab === 'integrari' && <IntegrationSettings />}

        {tab === 'loguri' && <LogsView />}
      </main>
    </div>
  )
}
