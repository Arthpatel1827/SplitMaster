import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Link2, Users } from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { LoadingScreen } from '../components/Spinner'
import BottomNav from '../components/BottomNav'
import { getErrorMessage } from '../utils/errors'

const AVATAR_STYLES = [
  'bg-tealbg text-teal',
  'bg-rustbg text-rust',
  'bg-sand text-[#5f5a4d]',
]

function initials(name) {
  const words = name.trim().split(/\s+/)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2)
  return letters.toUpperCase()
}

const money = (n) => `$${Math.abs(n).toFixed(2)}`

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Groups() {
  const [groups, setGroups] = useState(null)
  const [sheet, setSheet] = useState(null) // null | 'create' | 'join'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const toast = useToast()

  const loadGroups = async () => {
    try {
      const { data } = await client.get('/groups/')
      setGroups(data)
      setLoadError('')
    } catch (err) {
      setLoadError(getErrorMessage(err, 'Could not load your groups.'))
      setGroups((g) => g ?? [])
    }
  }

  useEffect(() => { loadGroups() }, [])

  const openSheet = (which) => { setError(''); setSheet(which) }

  const createGroup = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await client.post('/groups/', { name })
      setName('')
      setSheet(null)
      toast.success('Group created')
      loadGroups()
    } catch (err) {
      setError(getErrorMessage(err, 'Enter a group name.'))
    } finally {
      setBusy(false)
    }
  }

  const joinGroup = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await client.post('/groups/join/', { code })
      setCode('')
      setSheet(null)
      toast.success('Joined group')
      loadGroups()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not join that group.'))
    } finally {
      setBusy(false)
    }
  }

  if (groups === null) return <LoadingScreen />

  const balances = groups.map((g) => parseFloat(g.my_balance) || 0)
  const owed = balances.filter((b) => b > 0.005).reduce((a, b) => a + b, 0)
  const owe = balances.filter((b) => b < -0.005).reduce((a, b) => a + b, 0)
  const net = owed + owe

  return (
    <div className="max-w-md mx-auto px-5 pt-7 pb-28 animate-[fadeIn_0.25s_ease-out]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-sm text-muted font-medium">{greeting()}, {user?.username}</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your groups</h1>
        </div>
        <Link
          to="/account"
          aria-label="Account"
          className="w-11 h-11 rounded-full bg-tealbg text-teal flex items-center justify-center font-extrabold"
        >
          {user?.username?.[0]?.toUpperCase()}
        </Link>
      </div>

      {loadError && (
        <p className="text-rust text-sm mb-3">
          {loadError} <button onClick={loadGroups} className="underline">Retry</button>
        </p>
      )}

      <div className="bg-ink text-paper rounded-3xl p-5 mb-6">
        <div className="text-[13px] font-semibold text-[#b9b4a6]">Overall balance</div>
        <div className="text-3xl font-extrabold tracking-tight mt-0.5">
          {Math.abs(net) < 0.005 ? "You're all settled up" : net > 0 ? `You're owed ${money(net)}` : `You owe ${money(net)}`}
        </div>
        <div className="flex gap-2.5 mt-4">
          <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5">
            <div className="text-xs font-semibold text-[#b9b4a6]">You're owed</div>
            <div className="text-lg font-bold text-[#7fd4b8]">{money(owed)}</div>
          </div>
          <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5">
            <div className="text-xs font-semibold text-[#b9b4a6]">You owe</div>
            <div className="text-lg font-bold text-[#f2a68c]">{money(owe)}</div>
          </div>
        </div>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-extrabold">Groups</h2>
        <span className="text-[13px] text-muted font-semibold">{groups.length} active</span>
      </div>

      {groups.length === 0 && (
        <div className="border border-dashed border-line rounded-2xl px-6 py-10 text-center text-muted text-sm mb-4">
          <Users size={24} className="mx-auto mb-2 opacity-60" />
          No groups yet. Create one or join one with a code.
        </div>
      )}

      <div className="space-y-2.5 mb-5">
        {groups.map((g, i) => {
          const bal = parseFloat(g.my_balance) || 0
          return (
            <Link
              key={g.id}
              to={`/groups/${g.code}`}
              className="flex items-center gap-3.5 bg-white border border-[#e6e2d6] rounded-[20px] p-3.5 hover:border-ink transition-colors"
            >
              <div className={`w-12 h-12 rounded-[15px] flex items-center justify-center font-extrabold ${AVATAR_STYLES[i % AVATAR_STYLES.length]}`}>
                {initials(g.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{g.name}</div>
                <div className="font-mono text-xs text-muted mt-0.5">
                  {g.code} · {g.member_count} {g.member_count === 1 ? 'person' : 'people'}
                </div>
              </div>
              {Math.abs(bal) < 0.005 ? (
                <div className="text-[13px] font-bold text-[#5f5a4d] bg-sand rounded-full px-2.5 py-1.5">Settled up</div>
              ) : (
                <div className="text-right">
                  <div className="text-xs text-muted font-semibold">{bal > 0 ? "you're owed" : 'you owe'}</div>
                  <div className={`font-extrabold ${bal > 0 ? 'text-teal' : 'text-rust'}`}>{money(bal)}</div>
                </div>
              )}
            </Link>
          )
        })}
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={() => openSheet('create')}
          className="flex-1 h-[52px] rounded-2xl bg-teal text-white font-bold flex items-center justify-center gap-2"
        >
          <Plus size={18} strokeWidth={2.4} /> New group
        </button>
        <button
          onClick={() => openSheet('join')}
          className="flex-1 h-[52px] rounded-2xl bg-white border border-[#cfcab9] font-bold flex items-center justify-center gap-2"
        >
          <Link2 size={18} strokeWidth={2.2} /> Join with code
        </button>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-30 bg-black/45 flex items-end justify-center animate-[fadeIn_0.15s_ease-out]" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="bg-paper w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-[#cfcab9] mx-auto mb-4" />
            <div className="flex bg-sand rounded-2xl p-1 mb-5" role="tablist">
              {[['create', 'New group'], ['join', 'Join with code']].map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={sheet === key}
                  onClick={() => openSheet(key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm ${sheet === key ? 'bg-white font-bold' : 'text-muted font-semibold'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {sheet === 'create' ? (
              <form onSubmit={createGroup}>
                <label htmlFor="gname" className="block text-[13px] font-bold text-[#5f5a4d] mb-2">Group name</label>
                <input
                  id="gname" autoFocus
                  className="w-full h-[54px] rounded-2xl border-[1.5px] border-ink bg-white px-4 text-base outline-none"
                  placeholder="Lisbon trip, Flat 4B, Friday dinners"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-[13px] text-muted mt-2 mb-4">You'll get a 6-character code to share with friends.</p>
                {error && <p className="text-rust text-sm mb-3">{error}</p>}
                <button disabled={busy} className="w-full h-[54px] rounded-2xl bg-teal text-white font-extrabold disabled:opacity-60">
                  {busy ? 'Creating...' : 'Create group'}
                </button>
              </form>
            ) : (
              <form onSubmit={joinGroup}>
                <label htmlFor="gcode" className="block text-[13px] font-bold text-[#5f5a4d] mb-2">Group code</label>
                <input
                  id="gcode" autoFocus maxLength={8}
                  className="w-full h-[54px] rounded-2xl border-[1.5px] border-ink bg-white px-4 text-base font-mono tracking-widest outline-none"
                  placeholder="ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <p className="text-[13px] text-muted mt-2 mb-4">Ask a group member for their 6-character code.</p>
                {error && <p className="text-rust text-sm mb-3">{error}</p>}
                <button disabled={busy || !code} className="w-full h-[54px] rounded-2xl bg-teal text-white font-extrabold disabled:opacity-60">
                  {busy ? 'Joining...' : 'Join group'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
