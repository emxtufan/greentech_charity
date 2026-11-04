import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import { img } from '../../utils/helpers'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo mb-30">
        <Link to="/dashboard" className="d-block">
          <img
            src={img('logo-horizontal-light.png')}
            alt="Greentech Charity"
            style={{ height: 48 }}
          />
        </Link>
      </div>
      {user?.name && <p className="sidebar-user m0 mb-20">{user.name}</p>}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" end>
          Overview
        </NavLink>
        <NavLink to="/dashboard#donations">Donations</NavLink>
        <NavLink to="/dashboard#profile">Profile</NavLink>
        <NavLink to="/">Back to site</NavLink>
      </nav>
      <button type="button" className="btn-three mt-20" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  )
}
