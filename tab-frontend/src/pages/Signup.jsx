import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errors'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(username, password, email)
      navigate('/groups')
    } catch (err) {
      const data = err.response?.data
      setError(data?.password?.[0] || data?.username?.[0] || data?.email?.[0] || getErrorMessage(err, 'Could not create account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-10 animate-[fadeIn_0.25s_ease-out]">
      <div className="text-center mb-8">
        <div className="text-xs tracking-widest text-muted uppercase font-semibold">Tab</div>
        <h1 className="text-2xl font-bold mt-1">Split expenses, no limits</h1>
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
        <input
          type="email"
          className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
          placeholder="Email (optional, for password reset)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && <p className="text-rust text-sm">{error}</p>}
        <button
          className="w-full bg-ink text-paper font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
          type="submit"
          disabled={loading}
        >
          {loading ? <Spinner size={18} className="text-paper" /> : <UserPlus size={18} />}
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="text-center text-sm text-muted mt-6">
        Already have an account? <Link to="/login" className="text-ink font-semibold underline">Log in</Link>
      </p>
    </div>
  )
}