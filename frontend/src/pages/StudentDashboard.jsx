import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function StudentDashboard() {
  const navigate = useNavigate()
  const studentId = sessionStorage.getItem('studentId')
  const studentName = sessionStorage.getItem('studentName')
  const [reports, setReports] = useState([])
  const [reminders, setReminders] = useState([])
  const [file, setFile] = useState(null)
  const [workTerm, setWorkTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!studentId) {
      navigate('/student-login')
      return
    }
    fetchReports()
    fetchReminders()
  }, [])

  async function fetchReports() {
    try {
      const res = await fetch(`http://localhost:8000/student/${studentId}/reports`)
      setReports(await res.json())
    } catch { /* ignore */ }
  }

  async function fetchReminders() {
    try {
      const res = await fetch(`http://localhost:8000/student/${studentId}/reminders`)
      setReminders(await res.json())
    } catch { /* ignore */ }
  }

  async function handleUpload(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!file) { setError('Please select a PDF file.'); return }
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are accepted.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File size exceeds the 10 MB limit.'); return }
    if (!workTerm.trim()) { setError('Please enter a work term.'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('student_id', studentId)
    formData.append('work_term', workTerm)
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8000/student/upload-report', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Upload failed.')
        return
      }
      setMessage(data.message)
      setFile(null)
      setWorkTerm('')
      // Reset file input
      const fileInput = document.getElementById('reportFile')
      if (fileInput) fileInput.value = ''
      fetchReports()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setUploading(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('studentId')
    sessionStorage.removeItem('studentName')
    sessionStorage.removeItem('lastActivity')
    navigate('/student-login')
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—'
    return new Date(isoStr + 'Z').toLocaleString()
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2 className="form-title" style={{ marginBottom: 0 }}>Student Dashboard</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>
              Welcome, <strong>{studentName}</strong> ({studentId})
            </span>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Reminders */}
        {reminders.length > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
            <strong style={{ fontSize: '13px', color: '#b45309' }}>Reminders:</strong>
            {reminders.map(r => (
              <p key={r.id} style={{ fontSize: '13px', color: '#92400e', margin: '4px 0' }}>
                {r.message} <span style={{ fontSize: '11px', color: '#999' }}>({formatDate(r.sent_at)})</span>
              </p>
            ))}
          </div>
        )}

        {/* Upload Report */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Upload Work-Term Report</h3>
          <form onSubmit={handleUpload} className="submission-form" style={{ maxWidth: '500px' }}>
            <label htmlFor="workTerm">Work Term</label>
            <input
              id="workTerm"
              type="text"
              placeholder="e.g. Summer 2025"
              value={workTerm}
              onChange={e => setWorkTerm(e.target.value)}
              required
            />

            <label htmlFor="reportFile">PDF Report (max 10 MB)</label>
            <input
              id="reportFile"
              type="file"
              accept=".pdf"
              onChange={e => setFile(e.target.files[0])}
              required
            />

            {error && <span className="field-error">{error}</span>}
            {message && <span style={{ color: '#15803d', fontSize: '13px' }}>{message}</span>}
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Report'}
            </button>
          </form>
        </div>

        {/* Reports List */}
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Your Reports</h3>
        {reports.length === 0 ? (
          <p style={{ color: '#555', fontSize: '14px' }}>No reports submitted yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Work Term</th>
                  <th>File Name</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td>{r.work_term}</td>
                    <td>{r.file_name}</td>
                    <td>{formatDate(r.submitted_at)}</td>
                    <td>
                      {r.is_late ? (
                        <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '12px' }}>Late</span>
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: '600', fontSize: '12px' }}>On Time</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard
