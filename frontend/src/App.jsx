import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import StudentLogin from './pages/StudentLogin'
import CoordinatorLogin from './pages/CoordinatorLogin'
import EmployerLogin from './pages/EmployerLogin'
import CheckStatus from './pages/CheckStatus'

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
              placeholder="Create a password to check your status later"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />

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

function App() {
  return (
    <BrowserRouter>
      <div className="Navbar">
        <ul className="nav_links">
          <li>
            <Link to="/student-login">Student Login</Link>
          </li>
          <li>
            <Link to="/coordinator-login">Coordinator Login</Link>
          </li>
          <li>
            <Link to="/employer-login">Employer Login</Link>
          </li>
          <li>
            <Link to="/check-status">Check Application Status</Link>
          </li>
        </ul>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/coordinator-login" element={<CoordinatorLogin />} />
        <Route path="/employer-login" element={<EmployerLogin />} />
        <Route path="/check-status" element={<CheckStatus />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
