import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function EmployerLogin() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState('')
  const [verifyMsg, setVerifyMsg] = useState('')
  const navigate = useNavigate()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/employer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Login failed.')
        return
      }
      sessionStorage.setItem('employerId', data.id)
      sessionStorage.setItem('employerName', data.supervisor_name)
      sessionStorage.setItem('employerCompany', data.company_name)
      sessionStorage.setItem('employerEmail', data.email)
      sessionStorage.setItem('employerVerified', data.email_verified)
      sessionStorage.setItem('employerApproved', data.approved)
      sessionStorage.setItem('lastActivity', Date.now().toString())
      navigate('/employer-dashboard')
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setVerifyMsg('')
    try {
      const res = await fetch(`http://localhost:8000/employer/verify-email?token=${verifyToken}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setVerifyMsg(data.detail || 'Verification failed.')
      } else {
        setVerifyMsg('Email verified successfully! You can now login.')
      }
    } catch {
      setVerifyMsg('Could not reach the server.')
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Employer Login</h2>
        <form onSubmit={handleSubmit} className="submission-form">
          <label htmlFor="email">Email Address</label>
          <input id="email" name="email" type="email" placeholder="supervisor@company.com" value={form.email} onChange={handleChange} required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />

          {error && <span className="field-error">{error}</span>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
          <Link to="/employer-register" className="back-link">Don't have an account? Register</Link>
          <Link to="/" className="back-link">← Back to home</Link>
        </form>

        {/* Email Verification Section */}
        <div style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>Verify your email:</p>
          <form onSubmit={handleVerify} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Paste verification token"
              value={verifyToken}
              onChange={e => setVerifyToken(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}
              required
            />
            <button type="submit" className="btn-primary" style={{ marginTop: 0, padding: '8px 16px', fontSize: '12px' }}>Verify</button>
          </form>
          {verifyMsg && <p style={{ fontSize: '12px', marginTop: '6px', color: verifyMsg.includes('success') ? '#15803d' : '#d32f2f' }}>{verifyMsg}</p>}
        </div>
      </div>
    </div>
  )
}

export default EmployerLogin
