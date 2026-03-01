import { useState } from 'react'
import './App.css'

function App() {
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
    <>
      <div className="Navbar">
        <ul className="nav_links">
          <li>
            <a href="#">Student Login</a>
          </li>
          <li>
            <a href="#">Coordinator Login</a>
          </li>
          <li>
            <a href="#"> Employer Login</a>
          </li>
        </ul>
      </div>

      <div className="page">
        <div className="form-card">
          <h2 className="form-title">Student Submission</h2>
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
    </>
  )
}

export default App
