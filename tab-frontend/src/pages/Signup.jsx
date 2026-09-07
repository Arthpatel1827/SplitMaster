import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(username, password)
      navigate('/groups')
    } catch (err) {
      const data = err.response?.data
      const msg = data?.password?.[0] || data?.username?.[0] || 'Could not create account.'
      setError(msg)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-10">
      <div className="text-center mb-8">
        <div className="text-xs tracking-widest text-muted uppercase font-semibold">Tab</div>
        <h1 className="text-2xl font-bold mt-1">Split expenses, no limits</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-rust text-sm">{error}</p>}
        <button className="w-full bg-ink text-paper font-semibold py-3 rounded-xl" type="submit">
          Create account
        </button>
      </form>
      <p className="text-center text-sm text-muted mt-6">
        Already have an account? <Link to="/login" className="text-ink font-semibold underline">Log in</Link>
      </p>
    </div>
  )
}