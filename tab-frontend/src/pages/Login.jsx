import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/groups')
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-10 animate-[fadeIn_0.25s_ease-out]">
      <div className="text-center mb-8">
        <div className="text-xs tracking-widest text-muted uppercase font-semibold">Tab</div>
        <h1 className="text-2xl font-bold mt-1">Welcome back</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-rust text-sm">{error}</p>}
        <button
          className="w-full bg-ink text-paper font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          type="submit"
          disabled={loading}
        >
          {loading ? <Spinner size={18} className="text-paper" /> : <LogIn size={18} />}
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="text-center text-sm text-muted mt-6">
        New here? <Link to="/signup" className="text-ink font-semibold underline">Create an account</Link>
      </p>
    </div>
  )
}