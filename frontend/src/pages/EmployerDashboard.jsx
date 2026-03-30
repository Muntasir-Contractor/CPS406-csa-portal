import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function EmployerDashboard() {
  const navigate = useNavigate()
  const employerId = sessionStorage.getItem('employerId')
  const employerName = sessionStorage.getItem('employerName')
  const employerCompany = sessionStorage.getItem('employerCompany')
  const emailVerified = sessionStorage.getItem('employerVerified') === 'true'
  const approved = sessionStorage.getItem('employerApproved') === 'true'

  const [students, setStudents] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [evalForm, setEvalForm] = useState({ studentId: '', workTerm: '', behaviour: '', skills: '', knowledge: '', attitude: '' })
  const [evalFile, setEvalFile] = useState(null)
  const [evalMode, setEvalMode] = useState('form') // 'form' or 'pdf'
  const [rejForm, setRejForm] = useState({ studentId: '', reason: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('evaluate')

  useEffect(() => {
    if (!employerId) { navigate('/employer-login'); return }
    fetchStudents()
    fetchEvaluations()
  }, [])

  async function fetchStudents() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employer/${employerId}/students`)
      setStudents(await res.json())
    } catch { /* ignore */ }
  }

  async function fetchEvaluations() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/evaluations`)
      const all = await res.json()
      setEvaluations(all.filter(e => e.employer_id === parseInt(employerId)))
    } catch { /* ignore */ }
  }

  async function handleEvalSubmit(e) {
    e.preventDefault()
    setError(''); setMessage('')
    if (!emailVerified) { setError('You must verify your email before submitting evaluations.'); return }
    if (!approved) { setError('Your account must be approved by a coordinator before submitting evaluations.'); return }

    if (evalMode === 'pdf') {
      if (!evalFile) { setError('Please select a PDF file.'); return }
      const formData = new FormData()
      formData.append('employer_id', employerId)
      formData.append('student_id', evalForm.studentId)
      formData.append('work_term', evalForm.workTerm)
      formData.append('file', evalFile)
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/evaluation/submit-pdf`, { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) { setError(data.detail || 'Submission failed.'); return }
        setMessage(data.message)
        fetchEvaluations()
      } catch { setError('Could not reach the server.') }
    } else {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/evaluation/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employer_id: parseInt(employerId),
            student_id: parseInt(evalForm.studentId),
            work_term: evalForm.workTerm,
            behaviour: evalForm.behaviour,
            skills: evalForm.skills,
            knowledge: evalForm.knowledge,
            attitude: evalForm.attitude,
            submitted_by_role: 'employer',
          }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.detail || 'Submission failed.'); return }
        setMessage(data.message)
        setEvalForm({ studentId: '', workTerm: '', behaviour: '', skills: '', knowledge: '', attitude: '' })
        fetchEvaluations()
      } catch { setError('Could not reach the server.') }
    }
  }

  async function handleReject(e) {
    e.preventDefault()
    setError(''); setMessage('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/placement-rejection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(rejForm.studentId),
          employer_id: parseInt(employerId),
          reason: rejForm.reason || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Failed.'); return }
      setMessage(data.message)
      setRejForm({ studentId: '', reason: '' })
    } catch { setError('Could not reach the server.') }
  }

  function handleLogout() {
    sessionStorage.removeItem('employerId')
    sessionStorage.removeItem('employerName')
    sessionStorage.removeItem('employerCompany')
    sessionStorage.removeItem('employerEmail')
    sessionStorage.removeItem('employerVerified')
    sessionStorage.removeItem('employerApproved')
    sessionStorage.removeItem('lastActivity')
    navigate('/employer-login')
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—'
    return new Date(isoStr + 'Z').toLocaleString()
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2 className="form-title" style={{ marginBottom: 0 }}>Employer Dashboard</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>
              <strong>{employerName}</strong> — {employerCompany}
              {!emailVerified && <span style={{ color: '#dc2626', marginLeft: '8px' }}>(Email not verified)</span>}
              {!approved && <span style={{ color: '#b45309', marginLeft: '8px' }}>(Pending approval)</span>}
            </span>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['evaluate', 'reject', 'students', 'history'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); setMessage('') }}
              style={{ padding: '6px 16px', borderRadius: '6px', border: tab === t ? '2px solid #1a1a1a' : '1px solid #ddd', background: tab === t ? '#1a1a1a' : '#fff', color: tab === t ? '#FFDE63' : '#555', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>
              {t === 'evaluate' ? 'Submit Evaluation' : t === 'reject' ? 'Record Rejection' : t === 'students' ? 'Assigned Students' : 'Evaluation History'}
            </button>
          ))}
        </div>

        {error && <p className="field-error" style={{ marginBottom: '12px' }}>{error}</p>}
        {message && <p style={{ color: '#15803d', fontSize: '13px', marginBottom: '12px' }}>{message}</p>}

        {/* Submit Evaluation */}
        {tab === 'evaluate' && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button onClick={() => setEvalMode('form')} style={{ padding: '4px 12px', borderRadius: '4px', border: evalMode === 'form' ? '2px solid #1a1a1a' : '1px solid #ddd', background: evalMode === 'form' ? '#f5f5f5' : '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>Online Form</button>
              <button onClick={() => setEvalMode('pdf')} style={{ padding: '4px 12px', borderRadius: '4px', border: evalMode === 'pdf' ? '2px solid #1a1a1a' : '1px solid #ddd', background: evalMode === 'pdf' ? '#f5f5f5' : '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: 'DM Sans, sans-serif' }}>Upload PDF</button>
            </div>
            <form onSubmit={handleEvalSubmit} className="submission-form" style={{ maxWidth: '500px' }}>
              <label>Student ID</label>
              <input type="text" placeholder="e.g. 50012345" value={evalForm.studentId} onChange={e => setEvalForm({ ...evalForm, studentId: e.target.value })} required />
              <label>Work Term</label>
              <input type="text" placeholder="e.g. Summer 2025" value={evalForm.workTerm} onChange={e => setEvalForm({ ...evalForm, workTerm: e.target.value })} required />
              {evalMode === 'form' ? (
                <>
                  <label>Behaviour</label>
                  <textarea value={evalForm.behaviour} onChange={e => setEvalForm({ ...evalForm, behaviour: e.target.value })} placeholder="Describe behaviour..." style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minHeight: '60px', resize: 'vertical' }} required />
                  <label>Skills</label>
                  <textarea value={evalForm.skills} onChange={e => setEvalForm({ ...evalForm, skills: e.target.value })} placeholder="Describe skills..." style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minHeight: '60px', resize: 'vertical' }} required />
                  <label>Knowledge</label>
                  <textarea value={evalForm.knowledge} onChange={e => setEvalForm({ ...evalForm, knowledge: e.target.value })} placeholder="Describe knowledge..." style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minHeight: '60px', resize: 'vertical' }} required />
                  <label>Attitude</label>
                  <textarea value={evalForm.attitude} onChange={e => setEvalForm({ ...evalForm, attitude: e.target.value })} placeholder="Describe attitude..." style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minHeight: '60px', resize: 'vertical' }} required />
                </>
              ) : (
                <>
                  <label>Evaluation PDF</label>
                  <input type="file" accept=".pdf" onChange={e => setEvalFile(e.target.files[0])} required />
                </>
              )}
              <button type="submit" className="btn-primary">Submit Evaluation</button>
            </form>
          </div>
        )}

        {/* Record Placement Rejection */}
        {tab === 'reject' && (
          <form onSubmit={handleReject} className="submission-form" style={{ maxWidth: '500px' }}>
            <label>Student ID</label>
            <input type="text" placeholder="e.g. 50012345" value={rejForm.studentId} onChange={e => setRejForm({ ...rejForm, studentId: e.target.value })} required />
            <label>Reason (optional)</label>
            <textarea value={rejForm.reason} onChange={e => setRejForm({ ...rejForm, reason: e.target.value })} placeholder="Reason for rejection..." style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minHeight: '80px', resize: 'vertical' }} />
            <button type="submit" className="btn-primary">Record Rejection</button>
          </form>
        )}

        {/* Assigned Students */}
        {tab === 'students' && (
          students.length === 0 ? (
            <p style={{ color: '#555', fontSize: '14px' }}>No students assigned to your organization yet.</p>
          ) : (
            <table className="applications-table">
              <thead><tr><th>Student ID</th><th>Name</th><th>Email</th><th>Work Term</th></tr></thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i}><td>{s.student_id}</td><td>{s.full_name}</td><td>{s.email}</td><td>{s.work_term}</td></tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* Evaluation History (read-only) */}
        {tab === 'history' && (
          evaluations.length === 0 ? (
            <p style={{ color: '#555', fontSize: '14px' }}>No evaluations submitted yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="applications-table">
                <thead><tr><th>ID</th><th>Student ID</th><th>Work Term</th><th>Submitted</th><th>Type</th></tr></thead>
                <tbody>
                  {evaluations.map(ev => (
                    <tr key={ev.id}>
                      <td>{ev.id}</td>
                      <td>{ev.student_id}</td>
                      <td>{ev.work_term}</td>
                      <td>{formatDate(ev.submitted_at)}</td>
                      <td>{ev.pdf_path ? 'PDF' : 'Form'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Submitted evaluations are read-only and cannot be modified.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default EmployerDashboard
