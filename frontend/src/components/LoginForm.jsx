import { useState } from 'react'
import { Link } from 'react-router-dom'

function LoginForm({ role }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">{role} Login</h2>
        {submitted ? (
          <div className="success-message">
            <p>Logged in as {role}</p>
            <p><strong>Email:</strong> {form.email}</p>
            <button className="btn-secondary" onClick={() => setSubmitted(false)}>Back</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="submission-form">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
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

            <button type="submit" className="btn-primary">Login</button>
            <Link to="/" className="back-link">← Back to home</Link>
          </form>
        )}
      </div>
    </div>
  )
}

export default LoginForm
