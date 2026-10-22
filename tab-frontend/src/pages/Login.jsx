import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, User, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errors'

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
    } catch (err) {
      setError(err.response?.status === 401 ? 'Invalid username or password.' : getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 pt-14 pb-10 animate-[fadeIn_0.25s_ease-out]">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-teal text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-4">T.</div>
        <div className="text-[13px] tracking-widest text-muted uppercase font-bold">Tab</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">Welcome back</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full h-[54px] pl-11 pr-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password"
            className="w-full h-[54px] pl-11 pr-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-rust text-sm">{error}</p>}
        <div className="text-right -mt-2">
          <Link to="/forgot-password" className="text-sm text-muted hover:text-ink underline">Forgot password?</Link>
        </div>
        <button
          className="w-full bg-teal text-white font-extrabold h-[54px] rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
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