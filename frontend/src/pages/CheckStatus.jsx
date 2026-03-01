import { useState } from 'react'
import { Link } from 'react-router-dom'

const STATUS_STYLES = {
  pending: { label: 'Pending', className: 'status-pending' },
  accepted: { label: 'Accepted', className: 'status-accepted' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
}

function CheckStatus() {
  const [form, setForm] = useState({ studentId: '', password: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/studentapplication/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: form.studentId, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Could not find your application.')
      } else {
        setResult(data.status)
      }
    } catch {
      setError('Could not reach the server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const statusInfo = result ? (STATUS_STYLES[result] ?? { label: result, className: '' }) : null

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Check Application Status</h2>
        {result ? (
          <div className="success-message">
            <p>Application status for Student ID <strong>{form.studentId}</strong>:</p>
            <p className={statusInfo.className} style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              {statusInfo.label}
            </p>
            <button className="btn-secondary" onClick={() => { setResult(null); setForm({ studentId: '', password: '' }) }}>
              Check another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="submission-form">
            <label htmlFor="studentId">Student ID</label>
            <input
              id="studentId"
              name="studentId"
              type="text"
              placeholder="e.g. 50012345"
              value={form.studentId}
              onChange={handleChange}
              pattern="\d{8}"
              maxLength={8}
              required
            />
            {form.studentId && !/^\d{8}$/.test(form.studentId) && (
              <span className="field-error">Student ID must be exactly 8 digits</span>
            )}

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
              {loading ? 'Checking…' : 'Check Status'}
            </button>
            <Link to="/" className="back-link">← Back to home</Link>
          </form>
        )}
      </div>
    </div>
  )
}

export default CheckStatus
