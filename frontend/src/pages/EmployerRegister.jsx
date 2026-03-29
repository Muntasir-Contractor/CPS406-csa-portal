import { useState } from 'react'
import { Link } from 'react-router-dom'

function EmployerRegister() {
  const [form, setForm] = useState({ companyName: '', supervisorName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function validatePassword(pw) {
    if (pw.length < 8) return 'Password must be at least 8 characters long.'
    if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter.'
    if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const pwErr = validatePassword(form.password)
    if (pwErr) { setError(pwErr); return }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/employer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: form.companyName,
          supervisor_name: form.supervisorName,
          email: form.email,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Registration failed.')
        return
      }
      setSuccess(data)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Employer Registration</h2>
        {success ? (
          <div className="success-message">
            <p>Account created successfully!</p>
            <p>Your account needs to be approved by a coordinator before you can submit evaluations.</p>
            <p style={{ fontSize: '12px', color: '#555', marginTop: '8px' }}>
              Verification token (for email verification): <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{success.verification_token}</code>
            </p>
            <Link to="/employer-login" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', marginTop: '16px' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="submission-form">
            <label htmlFor="companyName">Company Name</label>
            <input id="companyName" name="companyName" type="text" placeholder="Acme Corp" value={form.companyName} onChange={handleChange} required />

            <label htmlFor="supervisorName">Supervisor Name</label>
            <input id="supervisorName" name="supervisorName" type="text" placeholder="Jane Smith" value={form.supervisorName} onChange={handleChange} required />

            <label htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" placeholder="supervisor@company.com" value={form.email} onChange={handleChange} required />

            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Min 8 chars, 1 letter, 1 number" value={form.password} onChange={handleChange} required />
            {form.password && validatePassword(form.password) && (
              <span className="field-error">{validatePassword(form.password)}</span>
            )}

            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Registering…' : 'Register'}
            </button>
            <Link to="/employer-login" className="back-link">Already have an account? Login</Link>
            <Link to="/" className="back-link">← Back to home</Link>
          </form>
        )}
      </div>
    </div>
  )
}

export default EmployerRegister
