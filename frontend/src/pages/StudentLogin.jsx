import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function StudentLogin() {
  const [form, setForm] = useState({ studentId: '', password: '' })
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: form.studentId, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Login failed. Please try again.')
        return
      }
      sessionStorage.setItem('studentId', data.student_id)
      sessionStorage.setItem('studentName', data.full_name)
      sessionStorage.setItem('lastActivity', Date.now().toString())
      navigate('/student-dashboard')
    } catch {
      setError('Could not reach the server. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Student Login</h2>
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

export default StudentLogin
