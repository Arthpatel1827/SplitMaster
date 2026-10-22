import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LogOut, Trash2, UserMinus } from 'lucide-react'
import client from '../api/client'
import { LoadingScreen } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmProvider'
import { getErrorMessage } from '../utils/errors'

export default function GroupSettings() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [members, setMembers] = useState([])
  const [settings, setSettings] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [s, g] = await Promise.all([
      client.get(`/groups/${code}/settings/`),
      client.get(`/groups/${code}/`),
    ])
    setSettings(s.data)
    setMembers(g.data.members)
    setName(s.data.name)
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err, 'Could not load settings.')))
  }, [code])

  const saveName = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { data } = await client.patch(`/groups/${code}/settings/`, { name })
      setSettings(data)
      toast.success('Group renamed')
    } catch (err) {
      setError(getErrorMessage(err, 'Enter a valid group name.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleSimplify = async () => {
    try {
      const { data } = await client.patch(`/groups/${code}/settings/`, {
        simplify_debts: !settings.simplify_debts,
      })
      setSettings(data)
      toast.success(data.simplify_debts ? 'Simplified settle-up on' : 'Simplified settle-up off')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not change that setting.'))
    }
  }

  const removeMember = async (m) => {
    const ok = await confirm({
      title: `Remove ${m.username}?`,
      message: "They'll lose access to this group. You can only remove someone who is fully settled up.",
      confirmLabel: 'Remove',
      danger: true,
    })
    if (!ok) return
    try {
      await client.delete(`/groups/${code}/members/${m.id}/`)
      toast.success(`${m.username} removed`)
      setMembers((list) => list.filter((x) => x.id !== m.id))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove that member.'))
    }
  }

  const leaveGroup = async () => {
    const ok = await confirm({
      title: 'Leave this group?',
      message: "You can only leave once you're fully settled up.",
      confirmLabel: 'Leave',
      danger: true,
    })
    if (!ok) return
    try {
      await client.post(`/groups/${code}/leave/`)
      toast.success('You left the group')
      navigate('/groups')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not leave the group.'))
    }
  }

  const deleteGroup = async () => {
    const ok = await confirm({
      title: 'Delete this group?',
      message: 'This permanently removes all expenses and activity for everyone. This cannot be undone.',
      confirmLabel: 'Delete group',
      danger: true,
    })
    if (!ok) return
    try {
      await client.delete(`/groups/${code}/delete/`)
      toast.success('Group deleted')
      navigate('/groups')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the group.'))
    }
  }

  if (!settings && error) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-rust text-sm mb-4">{error}</p>
        <Link to={`/groups/${code}`} className="underline text-sm">Back to group</Link>
      </div>
    )
  }
  if (!settings) return <LoadingScreen />

  return (
    <div className="max-w-md mx-auto px-5 py-6 animate-[fadeIn_0.25s_ease-out]">
      <Link to={`/groups/${code}`} className="text-muted text-sm hover:text-ink transition-colors">&larr; {settings.name}</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Group settings</h1>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <form onSubmit={saveName} className="mb-6">
        <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Group name</div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit" disabled={saving}
            className="bg-ink text-paper font-semibold px-5 rounded-xl disabled:opacity-60 transition-opacity"
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </form>

      <div className="bg-white border border-line rounded-2xl p-4 flex items-center justify-between mb-6">
        <div className="pr-4">
          <div className="font-semibold">Simplify settle-up</div>
          <p className="text-sm text-muted mt-1">
            When on, Tab suggests the fewest payments to settle everyone up. When off, you'll see exact pairwise amounts.
          </p>
        </div>
        <button
          onClick={toggleSimplify}
          className={`w-12 h-7 rounded-full flex-shrink-0 relative transition-colors ${
            settings.simplify_debts ? 'bg-teal' : 'bg-line'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              settings.simplify_debts ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Members</div>
      <div className="bg-white border border-line rounded-2xl divide-y divide-line mb-6">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="font-medium">{m.username}</span>
              {m.id === user?.id && <span className="text-xs text-muted ml-2">you</span>}
              {m.username === settings.creator_username && <span className="text-xs text-teal ml-2">owner</span>}
            </div>
            {settings.is_creator && m.id !== user?.id && (
              <button
                onClick={() => removeMember(m)}
                aria-label={`Remove ${m.username}`}
                className="text-rust p-1.5 rounded-lg hover:bg-rustbg transition-colors"
              >
                <UserMinus size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Danger zone</div>
      <button
        onClick={leaveGroup}
        className="w-full text-rust font-semibold py-3 rounded-xl border border-line mb-3 flex items-center justify-center gap-2 hover:bg-rustbg transition-colors"
      >
        <LogOut size={16} /> Leave group
      </button>
      {settings.is_creator && (
        <button
          onClick={deleteGroup}
          className="w-full bg-rustbg text-rust font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Trash2 size={16} /> Delete group
        </button>
      )}
    </div>
  )
}