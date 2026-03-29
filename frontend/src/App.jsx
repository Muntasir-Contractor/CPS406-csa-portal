import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import './App.css'
import StudentLogin from './pages/StudentLogin'
import CoordinatorLogin from './pages/CoordinatorLogin'
import EmployerLogin from './pages/EmployerLogin'
import EmployerRegister from './pages/EmployerRegister'
import EmployerDashboard from './pages/EmployerDashboard'
import CheckStatus from './pages/CheckStatus'
import CoordinatorDashboard from './pages/CoordinatorDashboard'
import StudentDashboard from './pages/StudentDashboard'

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes in ms

function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters long.'
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter.'
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number.'
  return null
}

function Home() {
  const [form, setForm] = useState({ name: '', studentId: '', email: '', password: '' })
  const [submitted, setSubmitted] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setDuplicate(false)

    const pwErr = validatePassword(form.password)
    if (pwErr) { setError(pwErr); return }

    try {
      const res = await fetch('http://localhost:8000/studentapplication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: form.name,
          student_id: form.studentId,
          email_address: form.email,
          password: form.password,
        }),
      })
      if (res.status === 409) {
        setDuplicate(true)
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Submission failed. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Could not reach the server. Please try again later.')
    }
  }

  return (
    <div className="page">
      <div className="form-card">
        <h2 className="form-title">Student CO-OP Application</h2>
        {submitted ? (
          <div className="success-message">
            <p>Submission received!</p>
            <p><strong>Name:</strong> {form.name}</p>
            <p><strong>Student ID:</strong> {form.studentId}</p>
            <p><strong>Email:</strong> {form.email}</p>
            <p>You can check your application status using your Student ID and password.</p>
            <button className="btn-secondary" onClick={() => { setSubmitted(false); setForm({ name: '', studentId: '', email: '', password: '' }) }}>Go Back</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="submission-form">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              value={form.name}
              onChange={handleChange}
              required
            />

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

            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="jane.doe@torontomu.ca"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Min 8 chars, 1 letter, 1 number"
              value={form.password}
              onChange={handleChange}
              required
            />
            {form.password && validatePassword(form.password) && (
              <span className="field-error">{validatePassword(form.password)}</span>
            )}

            {duplicate && (
              <div className="field-error">
                An application for this Student ID already exists.{' '}
                <Link to="/check-status">Check your application status</Link>
              </div>
            )}
            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="btn-primary">Submit</button>
          </form>
        )}
      </div>
    </div>
  )
}

// Session timeout watcher: logs out users after 30min of inactivity
function SessionWatcher() {
  const navigate = useNavigate()
  const location = useLocation()

  const checkTimeout = useCallback(() => {
    const lastActivity = sessionStorage.getItem('lastActivity')
    if (!lastActivity) return

    const elapsed = Date.now() - parseInt(lastActivity, 10)
    if (elapsed > SESSION_TIMEOUT) {
      // Clear all session data
      const keys = ['studentId', 'studentName', 'coordinatorName', 'coordinatorEmail',
                     'employerId', 'employerName', 'employerCompany', 'employerEmail',
                     'employerVerified', 'employerApproved', 'lastActivity']
      keys.forEach(k => sessionStorage.removeItem(k))
      navigate('/') // redirect to home
      alert('You have been logged out due to 30 minutes of inactivity.')
    }
  }, [navigate])

  // Update last activity on user interaction
  useEffect(() => {
    function updateActivity() {
      if (sessionStorage.getItem('lastActivity')) {
        sessionStorage.setItem('lastActivity', Date.now().toString())
      }
    }
    window.addEventListener('click', updateActivity)
    window.addEventListener('keydown', updateActivity)
    window.addEventListener('mousemove', updateActivity)

    // Check every 60 seconds
    const interval = setInterval(checkTimeout, 60000)

    return () => {
      window.removeEventListener('click', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('mousemove', updateActivity)
      clearInterval(interval)
    }
  }, [checkTimeout])

  // Also check on route changes
  useEffect(() => {
    checkTimeout()
  }, [location, checkTimeout])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <SessionWatcher />
      <div className="Navbar">
        <ul className="nav_links">
          <li><Link to="/">Apply</Link></li>
          <li><Link to="/student-login">Student Login</Link></li>
          <li><Link to="/coordinator-login">Coordinator Login</Link></li>
          <li><Link to="/employer-login">Employer Login</Link></li>
          <li><Link to="/check-status">Check Status</Link></li>
        </ul>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/coordinator-login" element={<CoordinatorLogin />} />
        <Route path="/employer-login" element={<EmployerLogin />} />
        <Route path="/employer-register" element={<EmployerRegister />} />
        <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        <Route path="/check-status" element={<CheckStatus />} />
        <Route path="/coordinator-dashboard" element={<CoordinatorDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
