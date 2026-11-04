import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import useAuth from '../hooks/useAuth'
import { img, isValidEmail } from '../utils/helpers'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' })
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

    if (values.name.trim().length < 2) nextErrors.name = 'Name must be at least 2 characters'
    if (!isValidEmail(values.email)) nextErrors.email = 'Please enter a valid email address'
    if (values.password.length < 6) nextErrors.password = 'Password must be at least 6 characters'
    if (values.confirm !== values.password) nextErrors.confirm = 'Passwords do not match'

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
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      navigate('/dashboard')
    } catch (error) {
      setServerError(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="text-center mb-30">
          <Link to="/" className="d-inline-block">
            <img src={img('logo_02.png')} alt="" />
          </Link>
        </div>

        <h3>Create an account</h3>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            label="Name"
            name="name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={values.name}
            onChange={handleChange}
            error={errors.name}
          />
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
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
          />
          <Input
            label="Confirm password"
            name="confirm"
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />

          <Button type="submit" variant="one" className="w-100" disabled={loading}>
            {loading ? 'Please wait...' : 'Register'}
          </Button>
        </form>

        {serverError && <p className="text-danger mt-3 mb-0">{serverError}</p>}

        <p className="text-center mt-3 mb-0">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}
