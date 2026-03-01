import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const STATUS_BADGE = {
  pending:  { label: 'Pending',  color: '#b45309', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
}

function formatDate(isoStr) {
  if (!isoStr) return '—'
  return new Date(isoStr + 'Z').toLocaleString()
}

function CoordinatorDashboard() {
  const navigate = useNavigate()
  const coordinatorName = sessionStorage.getItem('coordinatorName')
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!coordinatorName) {
      navigate('/coordinator-login')
      return
    }
    fetchApplications()
  }, [])

  async function fetchApplications() {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/applications')
      const data = await res.json()
      setApplications(data)
    } catch {
      setActionError('Could not load applications.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(studentId, action) {
    setActionError('')
    try {
      const res = await fetch(`http://localhost:8000/studentapplication/${studentId}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        setActionError(data.detail || 'Action failed.')
        return
      }
      await fetchApplications()
    } catch {
      setActionError('Could not reach the server.')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('coordinatorName')
    sessionStorage.removeItem('coordinatorEmail')
    navigate('/coordinator-login')
  }

  const badge = (status) => {
    const s = STATUS_BADGE[status] ?? { label: status, color: '#555', bg: '#eee' }
    return (
      <span style={{
        backgroundColor: s.bg,
        color: s.color,
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: '600',
      }}>
        {s.label}
      </span>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2 className="form-title" style={{ marginBottom: 0 }}>
            Co-op Applications
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#555' }}>
              Welcome, <strong>{coordinatorName}</strong>
            </span>
            <button className="btn-secondary" style={{ marginTop: 0 }} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {actionError && <p className="field-error" style={{ marginBottom: '12px' }}>{actionError}</p>}

        {loading ? (
          <p style={{ color: '#555', fontSize: '14px' }}>Loading applications…</p>
        ) : applications.length === 0 ? (
          <p style={{ color: '#555', fontSize: '14px' }}>No applications yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.student_id}>
                    <td>{app.student_id}</td>
                    <td>{app.full_name}</td>
                    <td>{app.email}</td>
                    <td>{badge(app.status)}</td>
                    <td>{formatDate(app.submitted_at)}</td>
                    <td>{formatDate(app.status_updated_at)}</td>
                    <td>
                      {app.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="action-btn accept-btn"
                            onClick={() => handleAction(app.student_id, 'accept')}
                          >
                            Accept
                          </button>
                          <button
                            className="action-btn reject-btn"
                            onClick={() => handleAction(app.student_id, 'reject')}
                          >
                            Reject
                          </button>
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
        )}
      </div>
    </div>
  )
}

export default CoordinatorDashboard
