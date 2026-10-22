import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Send } from 'lucide-react'
import client from '../api/client'
import { getErrorMessage } from '../utils/errors'
import Spinner from '../components/Spinner'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await client.post('/auth/password-reset/', { email })
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Enter a valid email address.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 pt-14 pb-10 animate-[fadeIn_0.25s_ease-out]">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-teal text-white font-extrabold text-xl flex items-center justify-center mx-auto mb-4">T.</div>
        <div className="text-[13px] tracking-widest text-muted uppercase font-bold">Tab</div>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">Forgot your password?</h1>
        <p className="text-sm text-muted mt-2">Enter the email on your account and we'll send you a reset link.</p>
      </div>

      {sent ? (
        <div className="bg-tealbg text-teal rounded-xl p-4 text-sm">
          If that email is registered, a reset link is on its way. Check your inbox (and spam folder).
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="email"
              required
              className="w-full h-[54px] pl-11 pr-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-rust text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal text-white font-extrabold h-[54px] rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Spinner size={18} className="text-paper" /> : <Send size={18} />}
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="text-center text-sm text-muted mt-6">
        <Link to="/login" className="text-ink font-semibold underline">Back to log in</Link>
      </p>
    </div>
  )
}
