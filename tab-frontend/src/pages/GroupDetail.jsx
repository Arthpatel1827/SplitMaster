import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Check, Undo2, Receipt, Scale, History, ChevronRight, Settings } from 'lucide-react'
import client from '../api/client'
import AddExpenseModal from '../components/AddExpenseModal'
import { LoadingScreen } from '../components/Spinner'

function initials(name) {
  return name.slice(0, 2).toUpperCase()
}

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

  useEffect(() => { loadGroup(); loadExpenses(); loadBalances(); loadActivity() }, [code])

  const recordPayment = async (t, i) => {
    setPayingId(i)
    try {
      await client.post(`/groups/${code}/record-payment/`, {
        from_user: t.from_user.id,
        to_user: t.to_user.id,
        amount: t.amount,
      })
      await Promise.all([loadBalances(), loadExpenses(), loadActivity()])
    } catch {
      setError('Could not record payment.')
    } finally {
      setPayingId(null)
    }
  }

  if (!group) return <LoadingScreen />

  return (
    <div className="max-w-md mx-auto px-5 py-6 pb-24 animate-[fadeIn_0.25s_ease-out]">
      <Link to="/groups" className="text-muted text-sm hover:text-ink transition-colors">&larr; Your groups</Link>

      <div className="flex items-center justify-between mt-2">
        <div>
          <div className="text-xs text-muted uppercase tracking-wide">Group</div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          <div className="text-xs text-muted font-mono mt-0.5">{group.code}</div>
        </div>
        <Link
          to={`/groups/${code}/settings`}
          className="w-9 h-9 rounded-full bg-tealbg text-teal flex items-center justify-center text-sm font-semibold hover:opacity-80 transition-opacity"
          title="Group settings"
        >
          {group.code.slice(0, 2)}
        </Link>
      </div>

      {error && <p className="text-rust text-sm mt-3">{error}</p>}

      <div className="flex border-b border-line mt-5 mb-5">
        {[
          { id: 'expenses', icon: Receipt, label: 'Expenses' },
          { id: 'balances', icon: Scale, label: 'Balances' },
          { id: 'activity', icon: History, label: 'Activity' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 text-center py-2.5 text-sm font-semibold transition-colors ${
              tab === id ? 'text-ink border-b-2 border-ink -mb-px' : 'text-muted hover:text-ink'
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
                <div className="font-semibold">Add your first expense</div>
                <p className="text-muted text-sm mt-1">Split a bill and Tab does the math.</p>
              </div>
            ) : (
              <div className="bg-white border border-line rounded-2xl divide-y divide-line mb-6">
                {expenses.map((e) => (
                  <Link
                    key={e.id}
                    to={`/groups/${code}/expenses/${e.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-paper2 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      e.kind === 'payment' ? 'bg-tealbg' : e.kind === 'refund' ? 'bg-rustbg' : 'bg-paper2'
                    }`}>
                      {e.kind === 'payment' ? <Check size={18} className="text-teal" /> :
                        e.kind === 'refund' ? <Undo2 size={18} className="text-rust" /> :
                        <Receipt size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{e.description}</div>
                      <div className="text-xs text-muted mt-0.5">
                        {e.kind === 'payment' ? 'settled up' : e.kind === 'refund' ? 'refund' :
                          `paid by ${e.paid_by.username} · split ${e.split_count}`}
                      </div>
                    </div>
                    <div className="font-mono font-semibold flex-shrink-0 ml-2">${e.amount}</div>
                    <ChevronRight size={16} className="text-muted flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAdd(true)}
              className="fixed bottom-6 w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center shadow-lg z-20 hover:scale-105 active:scale-95 transition-transform"
              style={{ right: 'max(1.25rem, calc(50% - 190px))' }}
            >
              <Plus size={26} />
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
            <div className={`rounded-2xl p-6 text-center mb-5 ${
              parseFloat(balances.my_balance) >= 0 ? 'bg-tealbg' : 'bg-rustbg'
            }`}>
              <div className={`text-xs uppercase tracking-wide font-semibold ${
                parseFloat(balances.my_balance) >= 0 ? 'text-teal' : 'text-rust'
              }`}>
                {parseFloat(balances.my_balance) >= 0 ? 'You are owed' : 'You owe'}
              </div>
              <div className={`text-4xl font-bold mt-1 font-mono ${
                parseFloat(balances.my_balance) >= 0 ? 'text-teal' : 'text-rust'
              }`}>
                ${Math.abs(parseFloat(balances.my_balance)).toFixed(2)}
              </div>
            </div>

            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">All balances</div>
            <div className="bg-white border border-line rounded-2xl mb-6 divide-y divide-line">
              {balances.balances.map((b) => {
                const amt = parseFloat(b.amount)
                return (
                  <div key={b.user.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-paper2 flex items-center justify-center text-xs font-semibold">
                        {initials(b.user.username)}
                      </div>
                      <span className="font-medium">{b.user.username}</span>
                    </div>
                    {Math.abs(amt) < 0.005 ? (
                      <span className="font-mono font-semibold text-muted">settled</span>
                    ) : amt > 0 ? (
                      <span className="font-mono font-semibold text-teal">+${amt.toFixed(2)}</span>
                    ) : (
                      <span className="font-mono font-semibold text-rust">-${Math.abs(amt).toFixed(2)}</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Settle up</div>
            {balances.settle_txns.length === 0 ? (
              <div className="text-center py-8">
                <Scale size={24} className="mx-auto mb-2 text-muted opacity-60" />
                <p className="text-muted text-sm">Everyone is settled up.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {balances.settle_txns.map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border border-line rounded-2xl px-4 py-3">
                    <div className="text-sm">
                      <span className="font-semibold">{t.from_user.username}</span> owes{' '}
                      <span className="font-semibold">{t.to_user.username}</span>
                      <div className="font-mono font-bold text-base mt-0.5">${t.amount}</div>
                    </div>
                    <button
                      onClick={() => recordPayment(t, i)}
                      disabled={payingId === i}
                      className="bg-teal text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-60 transition-opacity"
                    >
                      <Check size={15} />
                      {payingId === i ? 'Recording...' : 'Record'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'activity' && (
          <div className="bg-white border border-line rounded-2xl divide-y divide-line">
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