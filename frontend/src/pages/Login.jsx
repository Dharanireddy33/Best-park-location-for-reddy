import { useState } from 'react'


function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()

    console.log('Email:', email)
    console.log('Password:', password)

    alert('Login button clicked')
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Park Location Prediction</h1>

        <p>Find the best location and size for urban parks</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
