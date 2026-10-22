import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LogOut, Trash2, UserMinus, ChevronLeft, Copy } from 'lucide-react'
import client from '../api/client'
import { LoadingScreen } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmProvider'
import { getErrorMessage } from '../utils/errors'

const AVATARS = ['bg-tealbg text-teal', 'bg-rustbg text-rust', 'bg-sand text-[#5f5a4d]', 'bg-ink text-paper']
const sectionLabel = 'text-[13px] uppercase tracking-wider text-[#5f5a4d] font-extrabold mb-2'
const card = 'bg-white border border-[#e6e2d6] rounded-[20px]'

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

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(settings.code)
      toast.success('Group code copied')
    } catch {
      toast.error('Could not copy. The code is ' + settings.code)
    }
  }

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
    <div className="max-w-md mx-auto px-5 pt-5 pb-10 animate-[fadeIn_0.25s_ease-out]">
      <Link to={`/groups/${code}`} aria-label={`Back to ${settings.name}`} className="inline-flex items-center gap-1 -ml-2 h-11 pr-3 text-sm font-semibold text-[#5f5a4d]">
        <ChevronLeft size={22} strokeWidth={2.4} /> {settings.name}
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-6">Group settings</h1>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <form onSubmit={saveName} className="mb-6">
        <label htmlFor="gs-name" className={`block ${sectionLabel}`}>Group name</label>
        <div className="flex gap-2">
          <input
            id="gs-name"
            className="flex-1 min-w-0 h-[54px] px-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit" disabled={saving || name.trim() === settings.name}
            className="bg-teal text-white font-extrabold px-5 h-[54px] rounded-2xl disabled:opacity-40 transition-opacity"
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </form>

      <div className={`${card} p-4 flex items-center justify-between mb-6`}>
        <div className="pr-4">
          <div className="font-extrabold">Invite code</div>
          <div className="font-mono text-lg mt-0.5">{settings.code}</div>
        </div>
        <button onClick={copyCode} className="flex items-center gap-2 bg-sand font-bold text-sm rounded-xl px-4 h-11">
          <Copy size={16} /> Copy
        </button>
      </div>

      <div className={`${card} p-4 flex items-center justify-between mb-6`}>
        <div className="pr-4">
          <div className="font-extrabold" id="simplify-label">Simplify settle-up</div>
          <p className="text-sm text-muted mt-1">
            Show the fewest payments needed to settle everyone up. When off, you see exact pairwise amounts.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={settings.simplify_debts}
          aria-labelledby="simplify-label"
          onClick={toggleSimplify}
          className={`w-[52px] h-8 rounded-full flex-shrink-0 relative transition-colors ${settings.simplify_debts ? 'bg-teal' : 'bg-[#cfcab9]'}`}
        >
          <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${settings.simplify_debts ? 'left-[24px]' : 'left-1'}`} />
        </button>
      </div>

      <div className={sectionLabel}>Members ({members.length})</div>
      <div className={`${card} divide-y divide-sand overflow-hidden mb-8`}>
        {members.map((m, i) => (
          <div key={m.id} className="flex items-center gap-3 px-3.5 py-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-extrabold ${AVATARS[i % AVATARS.length]}`}>
              {m.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">{m.username}{m.id === user?.id && <span className="text-muted font-semibold"> (you)</span>}</div>
              {m.username === settings.creator_username && <div className="text-xs font-bold text-teal">Owner</div>}
            </div>
            {settings.is_creator && m.id !== user?.id && (
              <button
                onClick={() => removeMember(m)}
                aria-label={`Remove ${m.username}`}
                className="text-rust w-10 h-10 rounded-xl hover:bg-rustbg transition-colors flex items-center justify-center"
              >
                <UserMinus size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={sectionLabel}>Danger zone</div>
      <button
        onClick={leaveGroup}
        className="w-full h-[52px] rounded-2xl border border-[#cfcab9] bg-white text-rust font-bold mb-3 flex items-center justify-center gap-2"
      >
        <LogOut size={17} /> Leave group
      </button>
      {settings.is_creator && (
        <button
          onClick={deleteGroup}
          className="w-full h-[52px] rounded-2xl bg-rustbg text-rust font-bold flex items-center justify-center gap-2"
        >
          <Trash2 size={17} /> Delete group
        </button>
      )}
    </div>
  )
}
