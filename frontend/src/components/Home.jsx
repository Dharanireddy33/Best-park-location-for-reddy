import { Link } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export default function Home() {
  return (
    <div className="page home-page">
      <div className="card">
        <h1>Park Location Prediction</h1>
        <p>
          Securely register and login to access your dashboard, predict park
          suitability, and manage recovery workflows.
        </p>
        <div className="button-row">
          <Link className="button" to="/login">Login</Link>
          <Link className="button button-secondary" to="/register">Register</Link>
        </div>
        <div className="hint">
          Backend API: <span>{API_BASE_URL}</span>
        </div>
      </div>
    </div>
  )
}
