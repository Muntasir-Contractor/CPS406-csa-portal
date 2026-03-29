import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function CoordinatorLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/coordinator/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Login failed. Please try again.')
        return
      }
      sessionStorage.setItem('coordinatorName', data.name)
      sessionStorage.setItem('coordinatorEmail', data.email)
      sessionStorage.setItem('lastActivity', Date.now().toString())
      navigate('/coordinator-dashboard')
    } catch {
      setError('Could not reach the server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Coordinator Login</h2>
        <form onSubmit={handleSubmit} className="submission-form">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="coordinator@torontomu.ca"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <span className="field-error">{error}</span>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
          <Link to="/" className="back-link">← Back to home</Link>
        </form>
      </div>
    </div>
  )
}

export default CoordinatorLogin
