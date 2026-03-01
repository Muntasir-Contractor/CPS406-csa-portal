import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import StudentLogin from './pages/StudentLogin'
import CoordinatorLogin from './pages/CoordinatorLogin'
import EmployerLogin from './pages/EmployerLogin'

function Home() {
  const [form, setForm] = useState({ name: '', studentId: '', email: '' })
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
        <h2 className="form-title">Student CO-OP Application</h2>
        {submitted ? (
          <div className="success-message">
            <p>Submission received!</p>
            <p><strong>Name:</strong> {form.name}</p>
            <p><strong>Student ID:</strong> {form.studentId}</p>
            <p><strong>Email:</strong> {form.email}</p>
            <button className="btn-secondary" onClick={() => setSubmitted(false)}>Submit another</button>
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
        </ul>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/coordinator-login" element={<CoordinatorLogin />} />
        <Route path="/employer-login" element={<EmployerLogin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
