import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import useAuth from '../hooks/useAuth'
import { img, isValidEmail } from '../utils/helpers'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setValues((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!isValidEmail(values.email)) nextErrors.email = 'Please enter a valid email address'
    if (values.password.length < 6) nextErrors.password = 'Password must be at least 6 characters'

    return nextErrors
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate()
    setErrors(nextErrors)
    setServerError('')

    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)

    try {
      await login({ email: values.email.trim(), password: values.password })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (error) {
      setServerError(error.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-30">
          <Link to="/" className="d-inline-block">
            <img src={img('logo-full.png')} alt="Greentech Charity" style={{ height: 110 }} />
          </Link>
        </div>

        <h3>Welcome back</h3>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
          />

          <Button type="submit" variant="one" className="w-100" disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </Button>
        </form>

        {serverError && <p className="text-danger mt-3 mb-0">{serverError}</p>}

        <p className="text-center mt-3 mb-0">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}
