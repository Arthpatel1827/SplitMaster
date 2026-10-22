import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Check, Undo2, Receipt, Scale, History, ChevronLeft, Settings, Copy } from 'lucide-react'
import client from '../api/client'
import AddExpenseModal from '../components/AddExpenseModal'
import { LoadingScreen } from '../components/Spinner'
import { getErrorMessage } from '../utils/errors'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

function initials(name) {
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_STYLES = [
  'bg-tealbg text-teal',
  'bg-rustbg text-rust',
  'bg-sand text-[#5f5a4d]',
  'bg-ink text-paper',
]

const sectionLabel = 'text-[13px] font-extrabold text-[#5f5a4d] uppercase tracking-wider mb-2'

export default function GroupDetail() {
  const { code } = useParams()
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('expenses')
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState(null)
  const [activity, setActivity] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState(null)
  const toast = useToast()
  const { user: me } = useAuth()

  const loadGroup = async () => {
    const { data } = await client.get(`/groups/${code}/`)
    setGroup(data)
  }
  const loadExpenses = async () => {
    const { data } = await client.get(`/groups/${code}/expenses/`)
    setExpenses(data)
  }
  const loadBalances = async () => {
    const { data } = await client.get(`/groups/${code}/balances/`)
    setBalances(data)
  }
  const loadActivity = async () => {
    const { data } = await client.get(`/groups/${code}/activity/`)
    setActivity(data)
  }

  useEffect(() => {
    Promise.all([loadGroup(), loadExpenses(), loadBalances(), loadActivity()])
      .catch((err) => setError(getErrorMessage(err, 'Could not load this group.')))
  }, [code])

  const recordPayment = async (t, i) => {
    setPayingId(i)
    try {
      await client.post(`/groups/${code}/record-payment/`, {
        from_user: t.from_user.id,
        to_user: t.to_user.id,
        amount: t.amount,
      })
      await Promise.all([loadBalances(), loadExpenses(), loadActivity()])
      toast.success('Payment recorded')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record payment.'))
    } finally {
      setPayingId(null)
    }
  }

  if (!group && error) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-rust text-sm mb-4">{error}</p>
        <Link to="/groups" className="underline text-sm">Back to your groups</Link>
      </div>
    )
  }
  if (!group) return <LoadingScreen />

  const myBalance = balances ? parseFloat(balances.my_balance) || 0 : 0
  const settled = Math.abs(myBalance) < 0.005
  const owed = myBalance > 0
  const shown = group.members.slice(0, 4)
  const extra = group.members.length - shown.length

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.code)
      toast.success('Group code copied')
    } catch {
      toast.error('Could not copy. The code is ' + group.code)
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-5 pb-28 animate-[fadeIn_0.25s_ease-out]">
      <div className="flex items-center justify-between">
        <Link to="/groups" aria-label="Back to your groups" className="w-11 h-11 -ml-2.5 flex items-center justify-center">
          <ChevronLeft size={24} strokeWidth={2.4} />
        </Link>
        <Link
          to={`/groups/${code}/settings`}
          aria-label="Group settings"
          className="w-11 h-11 -mr-2.5 flex items-center justify-center text-[#5f5a4d]"
        >
          <Settings size={22} />
        </Link>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight -mt-1.5">{group.name}</h1>
      <div className="flex items-center gap-2.5 mt-2">
        <div className="flex">
          {shown.map((m, i) => (
            <div
              key={m.id}
              title={m.username}
              className={`w-7 h-7 rounded-full border-2 border-paper flex items-center justify-center text-[11px] font-extrabold ${i > 0 ? '-ml-2' : ''} ${AVATAR_STYLES[i % AVATAR_STYLES.length]}`}
            >
              {initials(m.username)}
            </div>
          ))}
          {extra > 0 && (
            <div className="w-7 h-7 rounded-full border-2 border-paper -ml-2 bg-ink text-paper flex items-center justify-center text-[11px] font-extrabold">
              +{extra}
            </div>
          )}
        </div>
        <span className="text-[13px] text-muted font-semibold">
          {group.members.length} {group.members.length === 1 ? 'person' : 'people'}
        </span>
        <button
          onClick={copyCode}
          aria-label={`Copy group code ${group.code}`}
          className="ml-auto flex items-center gap-1.5 bg-white border border-[#e6e2d6] rounded-full px-3 py-1.5 font-mono text-xs"
        >
          {group.code} <Copy size={14} />
        </button>
      </div>

      {error && <p className="text-rust text-sm mt-3">{error}</p>}

      <div className={`rounded-[22px] px-[18px] py-4 mt-4 flex items-center justify-between ${
        settled ? 'bg-sand' : owed ? 'bg-tealbg' : 'bg-rustbg'
      }`}>
        <div>
          <div className={`text-[13px] font-bold ${settled ? 'text-[#5f5a4d]' : owed ? 'text-teal' : 'text-rust'}`}>
            {settled ? 'All settled up' : owed ? "You're owed" : 'You owe'}
          </div>
          <div className={`text-[32px] leading-tight font-extrabold tracking-tight ${settled ? 'text-[#5f5a4d]' : owed ? 'text-teal' : 'text-rust'}`}>
            ${Math.abs(myBalance).toFixed(2)}
          </div>
        </div>
        {!settled && (
          <button
            onClick={() => setTab('balances')}
            className={`text-white text-sm font-bold rounded-2xl px-4 py-3 ${owed ? 'bg-teal' : 'bg-rust'}`}
          >
            Settle up
          </button>
        )}
      </div>

      <div className="flex bg-sand rounded-2xl p-1 mt-4 mb-4" role="tablist">
        {[
          { id: 'expenses', label: 'Expenses' },
          { id: 'balances', label: 'Balances' },
          { id: 'activity', label: 'Activity' },
        ].map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex-1 text-center py-2.5 rounded-xl text-sm transition-colors ${
              tab === id ? 'bg-white font-bold text-ink' : 'font-semibold text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="animate-[fadeIn_0.2s_ease-out]" key={tab}>
        {tab === 'expenses' && (
          <>
            {expenses.length === 0 ? (
              <div className="text-center py-10 mb-6 bg-white border border-dashed border-line rounded-2xl">
                <Receipt size={28} className="mx-auto mb-2 text-muted opacity-60" />
                <div className="font-bold">Add your first expense</div>
                <p className="text-muted text-sm mt-1">Split a bill and Tab does the math.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#e6e2d6] rounded-[20px] divide-y divide-sand mb-6 overflow-hidden">
                {expenses.map((e) => (
                  <Link
                    key={e.id}
                    to={`/groups/${code}/expenses/${e.id}`}
                    className="flex items-center gap-3 px-3.5 py-3 hover:bg-paper transition-colors"
                  >
                    <div className={`w-[42px] h-[42px] rounded-[13px] flex items-center justify-center flex-shrink-0 ${
                      e.kind === 'payment' ? 'bg-tealbg text-teal' : e.kind === 'refund' ? 'bg-rustbg text-rust' : 'bg-sand text-[#5f5a4d]'
                    }`}>
                      {e.kind === 'payment' ? <Check size={20} strokeWidth={2.4} /> :
                        e.kind === 'refund' ? <Undo2 size={20} /> :
                        <Receipt size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[15px] truncate">{e.description}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {e.kind === 'payment' ? 'settled up' : e.kind === 'refund' ? 'refund' :
                          `paid by ${e.paid_by.username} · split ${e.split_count}`}
                      </div>
                    </div>
                    <div className={`font-mono font-medium text-[15px] flex-shrink-0 ${
                      e.kind === 'payment' ? 'text-teal' : e.kind === 'refund' ? 'text-rust' : ''
                    }`}>
                      {parseFloat(e.amount) < 0 ? '-' : ''}${Math.abs(parseFloat(e.amount)).toFixed(2)}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAdd(true)}
              aria-label="Add expense"
              className="fixed bottom-7 h-14 rounded-full bg-teal text-white flex items-center gap-2 pl-[18px] pr-[22px] font-extrabold text-[15px] shadow-[0_8px_20px_rgba(15,110,86,0.35)] z-20 active:scale-95 transition-transform"
              style={{ right: 'max(1.25rem, calc(50% - 190px))' }}
            >
              <Plus size={20} strokeWidth={2.6} /> Add expense
            </button>

            {showAdd && (
              <AddExpenseModal
                code={code}
                members={group.members}
                onClose={() => setShowAdd(false)}
                onSaved={() => { setShowAdd(false); loadExpenses(); loadBalances(); loadActivity() }}
              />
            )}
          </>
        )}

        {tab === 'balances' && balances && (
          <>
            <div className={sectionLabel}>Everyone</div>
            <div className="bg-white border border-[#e6e2d6] rounded-[20px] divide-y divide-sand mb-6 overflow-hidden">
              {balances.balances.map((b, i) => {
                const amt = parseFloat(b.amount)
                return (
                  <div key={b.user.id} className="flex items-center gap-3 px-3.5 py-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold ${AVATAR_STYLES[i % AVATAR_STYLES.length]}`}>
                      {initials(b.user.username)}
                    </div>
                    <span className="flex-1 font-bold text-[15px]">
                      {b.user.username}{b.user.id === me?.id ? ' (you)' : ''}
                    </span>
                    {Math.abs(amt) < 0.005 ? (
                      <span className="font-mono text-muted">settled</span>
                    ) : amt > 0 ? (
                      <span className="font-mono text-teal">+${amt.toFixed(2)}</span>
                    ) : (
                      <span className="font-mono text-rust">-${Math.abs(amt).toFixed(2)}</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className={sectionLabel}>Settle up</div>
            {balances.settle_txns.length === 0 ? (
              <div className="text-center py-8">
                <Scale size={24} className="mx-auto mb-2 text-muted opacity-60" />
                <p className="text-muted text-sm">Everyone is settled up.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {balances.settle_txns.map((t, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border border-[#e6e2d6] rounded-[18px] px-3.5 py-3">
                    <div className="flex-1 text-sm">
                      <b>{t.from_user.username}</b> pays <b>{t.to_user.username}</b>
                      <div className="font-mono font-medium text-[17px] mt-0.5">${t.amount}</div>
                    </div>
                    <button
                      onClick={() => recordPayment(t, i)}
                      disabled={payingId === i}
                      className="bg-teal text-white text-sm font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-60 transition-opacity"
                    >
                      {payingId === i ? 'Recording...' : 'Record'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'activity' && (
          <div className="bg-white border border-[#e6e2d6] rounded-[20px] divide-y divide-sand overflow-hidden">
            {activity.length === 0 ? (
              <div className="text-center py-10">
                <History size={24} className="mx-auto mb-2 text-muted opacity-60" />
                <p className="text-muted text-sm">No activity yet.</p>
              </div>
            ) : (
              activity.map((entry, i) => (
                <div key={i} className="px-4 py-3">
                  <div className="text-sm">{entry.message}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
