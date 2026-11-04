import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import useContent from '../hooks/useContent'
import { img } from '../utils/helpers'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { isAdmin, setEditMode, adminLogin, adminLogout } = useContent()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const goToEdit = () => {
    setEditMode(true)
    navigate('/')
  }

  const handleLogout = () => {
    adminLogout()
    setPassword('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await adminLogin(password)
      goToEdit()
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-30">
          <Link to="/" className="d-inline-block">
            <img src={img('logo-full.png')} alt="Greentech Charity" style={{ height: 90 }} />
          </Link>
        </div>

        <h3>Admin</h3>

        {isAdmin ? (
          <>
            <p className="mb-3">You are logged in as admin</p>
            <Button variant="one" className="w-100" onClick={goToEdit}>
              Go to site &amp; edit
            </Button>
            <Button variant="two" className="w-100 mt-3" onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Admin password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button type="submit" variant="one" className="w-100" disabled={loading}>
              {loading ? 'Please wait...' : 'Login'}
            </Button>
          </form>
        )}

        {error && <p className="text-danger mt-3 mb-0">{error}</p>}
      </div>
    </div>
  )
}
