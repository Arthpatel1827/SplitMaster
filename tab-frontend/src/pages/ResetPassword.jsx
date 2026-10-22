import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, KeyRound } from 'lucide-react'
import client from '../api/client'
import { getErrorMessage } from '../utils/errors'
import { useToast } from '../context/ToastContext'
import Spinner from '../components/Spinner'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const uid = params.get('uid')
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setLoading(true)
    try {
      await client.post('/auth/password-reset/confirm/', { uid, token, new_password: password })
      toast.success('Password updated. Log in with your new password.')
      navigate('/login')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset your password.'))
    } finally {
      setLoading(false)
    }
  }

  if (!uid || !token) {
    return (
      <div className="max-w-sm mx-auto px-5 py-10 text-center">
        <p className="text-sm text-muted mb-4">This reset link is incomplete or invalid.</p>
        <Link to="/forgot-password" className="text-ink font-semibold underline">Request a new link</Link>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-10 animate-[fadeIn_0.25s_ease-out]">
      <div className="text-center mb-8">
        <div className="text-xs tracking-widest text-muted uppercase font-semibold">Tab</div>
        <h1 className="text-2xl font-bold mt-1">Choose a new password</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password" required autoComplete="new-password"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="password" required autoComplete="new-password"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="text-rust text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-ink text-paper font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Spinner size={18} className="text-paper" /> : <KeyRound size={18} />}
          {loading ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
