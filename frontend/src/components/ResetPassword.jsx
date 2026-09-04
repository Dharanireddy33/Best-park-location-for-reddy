import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: newPassword })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Unable to reset password')
      }
      setMessage(data.message || 'Password reset successfully.')
      setTimeout(() => {
        navigate('/login')
      }, 1600)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <h1>Reset password</h1>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
          />
          <label>Reset token</label>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          <label>New password</label>
          <input
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Reset password'}
          </button>
          {message && <div className="message">{message}</div>}
          {error && <div className="error">{error}</div>}
        </form>
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  )
}
