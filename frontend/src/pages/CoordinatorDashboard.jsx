import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const STATUS_BADGE = {
  pending:  { label: 'Pending',  color: '#b45309', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
  withdrawn: { label: 'Withdrawn', color: '#555', bg: '#eee' },
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr + 'Z').toLocaleString()
}

function CoordinatorDashboard() {
  const navigate = useNavigate()
  const coordinatorName = sessionStorage.getItem('coordinatorName')
  const [tab, setTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [employers, setEmployers] = useState([])
  const [reports, setReports] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  // Reminder form
  const [reminderStudentId, setReminderStudentId] = useState('')
  const [reminderMessage, setReminderMessage] = useState('')

  // Deadline form
  const [dlWorkTerm, setDlWorkTerm] = useState('')
  const [dlDate, setDlDate] = useState('')

  // Assignment form
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignEmployerId, setAssignEmployerId] = useState('')
  const [assignWorkTerm, setAssignWorkTerm] = useState('')

  // Bulk reminder
  const [bulkWorkTerm, setBulkWorkTerm] = useState('')
  const [studentsWithout, setStudentsWithout] = useState([])

  useEffect(() => {
    if (!coordinatorName) { navigate('/coordinator-login'); return }
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [appRes, empRes, repRes, evalRes, auditRes, dlRes] = await Promise.all([
        fetch('http://localhost:8000/applications'),
        fetch('http://localhost:8000/employers'),
        fetch('http://localhost:8000/reports'),
        fetch('http://localhost:8000/evaluations'),
        fetch('http://localhost:8000/audit-log'),
        fetch('http://localhost:8000/deadlines'),
      ])
      setApplications(await appRes.json())
      setEmployers(await empRes.json())
      setReports(await repRes.json())
      setEvaluations(await evalRes.json())
      setAuditLog(await auditRes.json())
      setDeadlines(await dlRes.json())
    } catch {
      setActionError('Could not load data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(studentId, action) {
    setActionError(''); setActionMsg('')
    try {
      const res = await fetch(`http://localhost:8000/studentapplication/${studentId}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setActionError(data.detail || 'Action failed.'); return }
      setActionMsg(data.message)
      fetchAll()
    } catch { setActionError('Could not reach the server.') }
  }

  async function handleFinalize(studentId) {
    setActionError(''); setActionMsg('')
    try {
      const res = await fetch(`http://localhost:8000/studentapplication/${studentId}/finalize`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setActionError(data.detail || 'Failed.'); return }
      setActionMsg(data.message)
      fetchAll()
    } catch { setActionError('Could not reach the server.') }
  }

  async function handleApproveEmployer(empId) {
    setActionError(''); setActionMsg('')
    try {
      const res = await fetch(`http://localhost:8000/employer/${empId}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setActionError(data.detail || 'Failed.'); return }
      setActionMsg(data.message)
      fetchAll()
    } catch { setActionError('Could not reach the server.') }
  }

  async function handleSendReminder(e) {
    e.preventDefault()
    setActionError(''); setActionMsg('')
    try {
      const res = await fetch('http://localhost:8000/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: parseInt(reminderStudentId), message: reminderMessage }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.detail || 'Failed.'); return }
      setActionMsg('Reminder sent.')
      setReminderStudentId('')
      setReminderMessage('')
    } catch { setActionError('Could not reach the server.') }
  }

  async function handleSetDeadline(e) {
    e.preventDefault()
    setActionError(''); setActionMsg('')
    try {
      const res = await fetch('http://localhost:8000/deadline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_term: dlWorkTerm, deadline_date: dlDate }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.detail || 'Failed.'); return }
      setActionMsg('Deadline set.')
      setDlWorkTerm('')
      setDlDate('')
      fetchAll()
    } catch { setActionError('Could not reach the server.') }
  }

  async function handleAssign(e) {
    e.preventDefault()
    setActionError(''); setActionMsg('')
    try {
      const res = await fetch('http://localhost:8000/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: parseInt(assignStudentId), employer_id: parseInt(assignEmployerId), work_term: assignWorkTerm }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.detail || 'Failed.'); return }
      setActionMsg('Student assigned to employer.')
      setAssignStudentId('')
      setAssignEmployerId('')
      setAssignWorkTerm('')
    } catch { setActionError('Could not reach the server.') }
  }

  async function handleFetchStudentsWithout(e) {
    e.preventDefault()
    try {
      const res = await fetch(`http://localhost:8000/students-without-reports/${bulkWorkTerm}`)
      setStudentsWithout(await res.json())
    } catch { setActionError('Could not fetch.') }
  }

  async function handleBulkReminder() {
    setActionError(''); setActionMsg('')
    for (const s of studentsWithout) {
      await fetch('http://localhost:8000/reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: s.student_id, message: `Reminder: Please submit your work-term report for ${bulkWorkTerm}.` }),
      })
    }
    setActionMsg(`Reminders sent to ${studentsWithout.length} students.`)
    setStudentsWithout([])
  }

  function handleLogout() {
    sessionStorage.removeItem('coordinatorName')
    sessionStorage.removeItem('coordinatorEmail')
    sessionStorage.removeItem('lastActivity')
    navigate('/coordinator-login')
  }

  const badge = (status) => {
    const s = STATUS_BADGE[status] ?? { label: status, color: '#555', bg: '#eee' }
    return <span style={{ backgroundColor: s.bg, color: s.color, padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>{s.label}</span>
  }

  const tabs = [
    { key: 'applications', label: 'Applications' },
    { key: 'employers', label: 'Employers' },
    { key: 'reports', label: 'Reports' },
    { key: 'evaluations', label: 'Evaluations' },
    { key: 'reminders', label: 'Reminders' },
    { key: 'assignments', label: 'Assignments' },
    { key: 'audit', label: 'Audit Log' },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2 className="form-title" style={{ marginBottom: 0 }}>Coordinator Dashboard</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>Welcome, <strong>{coordinatorName}</strong></span>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setActionError(''); setActionMsg('') }}
              style={{ padding: '6px 14px', borderRadius: '6px', border: tab === t.key ? '2px solid #1a1a1a' : '1px solid #ddd', background: tab === t.key ? '#1a1a1a' : '#fff', color: tab === t.key ? '#FFDE63' : '#555', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'DM Sans, sans-serif' }}>
              {t.label}
            </button>
          ))}
        </div>

        {actionError && <p className="field-error" style={{ marginBottom: '12px' }}>{actionError}</p>}
        {actionMsg && <p style={{ color: '#15803d', fontSize: '13px', marginBottom: '12px' }}>{actionMsg}</p>}

        {loading ? <p style={{ color: '#555', fontSize: '14px' }}>Loading…</p> : (
          <>
            {/* Applications Tab */}
            {tab === 'applications' && (
              applications.length === 0 ? <p style={{ color: '#555', fontSize: '14px' }}>No applications yet.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="applications-table">
                    <thead>
                      <tr><th>Student ID</th><th>Name</th><th>Email</th><th>Status</th><th>Submitted</th><th>Last Updated</th><th>Finalized</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {applications.map(app => (
                        <tr key={app.student_id}>
                          <td>{app.student_id}</td>
                          <td>{app.full_name}</td>
                          <td>{app.email}</td>
                          <td>{badge(app.status)}</td>
                          <td>{formatDate(app.submitted_at)}</td>
                          <td>{formatDate(app.status_updated_at)}</td>
                          <td>{app.is_finalized ? <span style={{ color: '#15803d', fontWeight: '600', fontSize: '12px' }}>Yes</span> : <span style={{ color: '#999', fontSize: '12px' }}>No</span>}</td>
                          <td>
                            {!app.is_finalized && app.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="action-btn accept-btn" onClick={() => handleAction(app.student_id, 'accept')}>Accept</button>
                                <button className="action-btn reject-btn" onClick={() => handleAction(app.student_id, 'reject')}>Reject</button>
                              </div>
                            ) : !app.is_finalized && (app.status === 'accepted' || app.status === 'rejected') ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="action-btn" style={{ background: '#6366f1', color: '#fff' }} onClick={() => handleFinalize(app.student_id)}>Finalize</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#999' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Employers Tab */}
            {tab === 'employers' && (
              employers.length === 0 ? <p style={{ color: '#555', fontSize: '14px' }}>No employer accounts yet.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="applications-table">
                    <thead>
                      <tr><th>ID</th><th>Company</th><th>Supervisor</th><th>Email</th><th>Verified</th><th>Approved</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {employers.map(emp => (
                        <tr key={emp.id}>
                          <td>{emp.id}</td>
                          <td>{emp.company_name}</td>
                          <td>{emp.supervisor_name}</td>
                          <td>{emp.email}</td>
                          <td>{emp.email_verified ? <span style={{ color: '#15803d' }}>Yes</span> : <span style={{ color: '#dc2626' }}>No</span>}</td>
                          <td>{emp.approved ? <span style={{ color: '#15803d' }}>Yes</span> : <span style={{ color: '#dc2626' }}>No</span>}</td>
                          <td>
                            {!emp.approved && (
                              <button className="action-btn accept-btn" onClick={() => handleApproveEmployer(emp.id)}>Approve</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* Reports Tab */}
            {tab === 'reports' && (
              <div>
                {reports.length === 0 ? <p style={{ color: '#555', fontSize: '14px' }}>No reports submitted yet.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="applications-table">
                      <thead><tr><th>Student ID</th><th>Name</th><th>Work Term</th><th>File</th><th>Submitted</th><th>Status</th></tr></thead>
                      <tbody>
                        {reports.map(r => (
                          <tr key={r.id}>
                            <td>{r.student_id}</td>
                            <td>{r.full_name}</td>
                            <td>{r.work_term}</td>
                            <td>{r.file_name}</td>
                            <td>{formatDate(r.submitted_at)}</td>
                            <td>{r.is_late ? <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '12px' }}>Late</span> : <span style={{ color: '#15803d', fontWeight: '600', fontSize: '12px' }}>On Time</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Set Deadline */}
                <div style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Set Report Deadline</h3>
                  <form onSubmit={handleSetDeadline} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div><label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Work Term</label><input type="text" placeholder="e.g. Summer 2025" value={dlWorkTerm} onChange={e => setDlWorkTerm(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }} required /></div>
                    <div><label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Deadline Date</label><input type="datetime-local" value={dlDate} onChange={e => setDlDate(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }} required /></div>
                    <button type="submit" className="btn-primary" style={{ marginTop: 0, padding: '8px 16px' }}>Set Deadline</button>
                  </form>
                  {deadlines.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#555', fontWeight: '600' }}>Current Deadlines:</p>
                      {deadlines.map((d, i) => <p key={i} style={{ fontSize: '12px', color: '#555' }}>{d.work_term}: {d.deadline_date}</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Evaluations Tab */}
            {tab === 'evaluations' && (
              evaluations.length === 0 ? <p style={{ color: '#555', fontSize: '14px' }}>No evaluations submitted yet.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="applications-table">
                    <thead><tr><th>ID</th><th>Student ID</th><th>Student</th><th>Work Term</th><th>Submitted By</th><th>Company</th><th>Submitted</th><th>Type</th><th>View</th></tr></thead>
                    <tbody>
                      {evaluations.map(ev => (
                        <tr key={ev.id}>
                          <td>{ev.id}</td>
                          <td>{ev.student_id}</td>
                          <td>{ev.student_name || '—'}</td>
                          <td>{ev.work_term}</td>
                          <td>{ev.submitted_by_role}</td>
                          <td>{ev.company_name || '—'}</td>
                          <td>{formatDate(ev.submitted_at)}</td>
                          <td>{ev.pdf_path ? 'PDF' : 'Form'}</td>
                          <td>
                            {ev.pdf_path ? (
                              <a
                                href={`http://localhost:8000/uploads/${ev.pdf_path.split(/[/\\]/).pop()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#2563eb', fontWeight: '600', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
                              >
                                View PDF
                              </a>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>All evaluations are read-only once submitted.</p>
                </div>
              )
            )}

            {/* Reminders Tab */}
            {tab === 'reminders' && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Send Reminder to Student</h3>
                <form onSubmit={handleSendReminder} className="submission-form" style={{ maxWidth: '500px', marginBottom: '24px' }}>
                  <label>Student ID</label>
                  <input type="text" placeholder="e.g. 50012345" value={reminderStudentId} onChange={e => setReminderStudentId(e.target.value)} required />
                  <label>Message</label>
                  <textarea value={reminderMessage} onChange={e => setReminderMessage(e.target.value)} placeholder="Reminder message..." style={{ padding: '10px 14px', border: '1.5px solid #ddd', borderRadius: '8px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', minHeight: '80px', resize: 'vertical' }} required />
                  <button type="submit" className="btn-primary">Send Reminder</button>
                </form>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Bulk Reminder — Students Without Reports</h3>
                  <form onSubmit={handleFetchStudentsWithout} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <div><label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Work Term</label><input type="text" placeholder="e.g. Summer 2025" value={bulkWorkTerm} onChange={e => setBulkWorkTerm(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: '8px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }} required /></div>
                    <button type="submit" className="btn-primary" style={{ marginTop: 0, padding: '8px 16px' }}>Find Students</button>
                  </form>
                  {studentsWithout.length > 0 && (
                    <div>
                      <p style={{ fontSize: '13px', marginBottom: '8px' }}>{studentsWithout.length} students haven't submitted reports:</p>
                      <ul style={{ fontSize: '13px', marginBottom: '8px', paddingLeft: '20px' }}>
                        {studentsWithout.map(s => <li key={s.student_id}>{s.student_id} — {s.full_name} ({s.email})</li>)}
                      </ul>
                      <button className="btn-primary" style={{ padding: '8px 16px' }} onClick={handleBulkReminder}>Send Reminders to All</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assignments Tab */}
            {tab === 'assignments' && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Assign Student to Employer</h3>
                <form onSubmit={handleAssign} className="submission-form" style={{ maxWidth: '500px' }}>
                  <label>Student ID</label>
                  <input type="text" placeholder="e.g. 50012345" value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} required />
                  <label>Employer ID</label>
                  <input type="text" placeholder="e.g. 1" value={assignEmployerId} onChange={e => setAssignEmployerId(e.target.value)} required />
                  <label>Work Term</label>
                  <input type="text" placeholder="e.g. Summer 2025" value={assignWorkTerm} onChange={e => setAssignWorkTerm(e.target.value)} required />
                  <button type="submit" className="btn-primary">Assign</button>
                </form>
                {employers.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <p style={{ fontSize: '12px', color: '#555', fontWeight: '600', marginBottom: '6px' }}>Available Employers:</p>
                    {employers.map(e => <p key={e.id} style={{ fontSize: '12px', color: '#555' }}>ID: {e.id} — {e.company_name} ({e.supervisor_name})</p>)}
                  </div>
                )}
              </div>
            )}

            {/* Audit Log Tab */}
            {tab === 'audit' && (
              auditLog.length === 0 ? <p style={{ color: '#555', fontSize: '14px' }}>No audit log entries yet.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="applications-table">
                    <thead><tr><th>ID</th><th>Student ID</th><th>Action</th><th>Acting Role</th><th>Acting User</th><th>Timestamp</th></tr></thead>
                    <tbody>
                      {auditLog.map(entry => (
                        <tr key={entry.id}>
                          <td>{entry.id}</td>
                          <td>{entry.student_id}</td>
                          <td><span style={{ fontWeight: '600', color: entry.action === 'accept' ? '#15803d' : '#dc2626' }}>{entry.action}</span></td>
                          <td>{entry.acting_role}</td>
                          <td>{entry.acting_user || '—'}</td>
                          <td>{formatDate(entry.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CoordinatorDashboard
