import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import client from '../api/client'
import { Receipt, Check, Undo2, ChevronLeft, Pencil, Trash2, CalendarDays } from 'lucide-react'
import { LoadingScreen } from '../components/Spinner'
import ExpenseFormFields, { MAX_RECEIPTS } from '../components/ExpenseFormFields'
import { getErrorMessage } from '../utils/errors'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmProvider'

function initials(name) {
  return name.slice(0, 2).toUpperCase()
}

export default function ExpenseDetail() {
  const { code, id } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [expense, setExpense] = useState(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const toast = useToast()
  const confirm = useConfirm()

  // edit form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitAmong, setSplitAmong] = useState([])
  const [splitType, setSplitType] = useState('equal')
  const [shares, setShares] = useState({})
  const [notes, setNotes] = useState('')
  const [receipts, setReceipts] = useState([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [g, e] = await Promise.all([
      client.get(`/groups/${code}/`),
      client.get(`/groups/${code}/expenses/${id}/`),
    ])
    setGroup(g.data)
    setExpense(e.data)
    setDescription(e.data.description)
    setAmount(e.data.amount)
    setPaidBy(e.data.paid_by.id)
    setSplitAmong(e.data.splits.map((s) => s.user.id))
    setSplitType(e.data.split_type)
    setNotes(e.data.notes || '')
    setReceipts(e.data.receipts.map((r) => ({ key: `r${r.id}`, id: r.id, url: r.url })))
    // prefill custom split values so editing doesn't start from blank inputs
    const total = parseFloat(e.data.amount) || 0
    const prefill = {}
    e.data.splits.forEach((s) => {
      if (e.data.split_type === 'percent') {
        prefill[s.user.id] = total ? String(Math.round((parseFloat(s.share) / total) * 10000) / 100) : ''
      } else {
        prefill[s.user.id] = s.share // exact amounts; for "shares" the amounts keep the same ratios
      }
    })
    setShares(e.data.split_type === 'equal' ? {} : prefill)
  }

  useEffect(() => {
    load().catch((err) => setLoadError(getErrorMessage(err, 'Could not load this expense.')))
  }, [code, id])

  if (loadError) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-rust text-sm mb-4">{loadError}</p>
        <Link to={`/groups/${code}`} className="underline text-sm">Back to group</Link>
      </div>
    )
  }

  if (!group || !expense) return <LoadingScreen />

  const members = group.members
  const toggleMember = (mid) => {
    setSplitAmong((prev) => (prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]))
  }

  const addFiles = (files) => {
    const room = MAX_RECEIPTS - receipts.length
    if (files.length > room) toast.error(`You can attach up to ${MAX_RECEIPTS} receipts.`)
    const items = files.slice(0, Math.max(room, 0)).map((file) => ({
      key: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file),
    }))
    setReceipts((prev) => [...prev, ...items])
  }

  const removeReceipt = (key) => setReceipts((prev) => prev.filter((r) => r.key !== key))

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (splitAmong.length === 0) {
      setError('Select at least one person to split with.')
      return
    }
    setSaving(true)
    try {
      const form = new FormData()
      form.append('description', description)
      form.append('amount', amount)
      form.append('paid_by', paidBy)
      form.append('split_among', JSON.stringify(splitAmong))
      form.append('split_type', splitType)
      form.append('shares', JSON.stringify(shares))
      form.append('notes', notes)
      const keptIds = receipts.filter((r) => r.id).map((r) => r.id)
      const removedIds = expense.receipts.map((r) => r.id).filter((rid) => !keptIds.includes(rid))
      form.append('remove_receipt_ids', JSON.stringify(removedIds))
      receipts.filter((r) => r.file).forEach((r) => form.append('receipts', r.file))

      await client.put(`/groups/${code}/expenses/${id}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEditing(false)
      toast.success('Expense updated')
      load()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save changes.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete this expense?',
      message: 'This removes it from everyone\'s balances. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    try {
      await client.delete(`/groups/${code}/expenses/${id}/`)
      toast.success('Expense deleted')
      navigate(`/groups/${code}`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the expense.'))
    }
  }

  const handleRefund = async () => {
    const ok = await confirm({
      title: 'Refund this expense?',
      message: 'This reverses the split for everyone. The original expense stays in the history.',
      confirmLabel: 'Refund',
    })
    if (!ok) return
    try {
      await client.post(`/groups/${code}/expenses/${id}/refund/`)
      toast.success('Expense refunded')
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not refund the expense.'))
    }
  }

  if (editing) {
    return (
      <div className="max-w-md mx-auto px-5 pt-5 pb-10 animate-[fadeIn_0.25s_ease-out]">
        <button
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1 -ml-2 h-11 pr-3 text-sm font-semibold text-[#5f5a4d]"
        >
          <ChevronLeft size={22} strokeWidth={2.4} /> Cancel
        </button>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1 mb-5">Edit expense</h1>

        <form onSubmit={handleSave} className="space-y-5">
          <ExpenseFormFields
            members={members}
            description={description} setDescription={setDescription}
            amount={amount} setAmount={setAmount}
            paidBy={paidBy} setPaidBy={setPaidBy}
            splitAmong={splitAmong} toggleMember={toggleMember}
            splitType={splitType} setSplitType={setSplitType}
            shares={shares} setShares={setShares}
            notes={notes} setNotes={setNotes}
            receipts={receipts} onAddFiles={addFiles} onRemoveReceipt={removeReceipt}
          />
          {error && <p className="text-rust text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-teal text-white font-extrabold h-[54px] rounded-2xl disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    )
  }

  const kindStyle = expense.kind === 'payment'
    ? { tile: 'bg-tealbg text-teal', label: 'Settle-up', labelCls: 'bg-tealbg text-teal' }
    : expense.kind === 'refund'
      ? { tile: 'bg-rustbg text-rust', label: 'Refund', labelCls: 'bg-rustbg text-rust' }
      : { tile: 'bg-sand text-[#5f5a4d]', label: 'Expense', labelCls: 'bg-sand text-[#5f5a4d]' }
  const totalAbs = Math.abs(parseFloat(expense.amount)) || 1
  const fmt = (v) => `${parseFloat(v) < 0 ? '-' : ''}$${Math.abs(parseFloat(v)).toFixed(2)}`
  const AVATARS = ['bg-tealbg text-teal', 'bg-rustbg text-rust', 'bg-sand text-[#5f5a4d]', 'bg-ink text-paper']

  return (
    <div className="max-w-md mx-auto px-5 pt-5 pb-10 animate-[fadeIn_0.25s_ease-out]">
      <Link to={`/groups/${code}`} aria-label={`Back to ${group.name}`} className="inline-flex items-center gap-1 -ml-2 h-11 pr-3 text-sm font-semibold text-[#5f5a4d]">
        <ChevronLeft size={22} strokeWidth={2.4} /> {group.name}
      </Link>

      <div className="bg-white border border-[#e6e2d6] rounded-[28px] px-5 py-7 text-center mt-1 mb-4">
        <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4 ${kindStyle.tile}`}>
          {expense.kind === 'payment' ? <Check size={30} strokeWidth={2.4} /> :
            expense.kind === 'refund' ? <Undo2 size={30} /> :
              <Receipt size={30} />}
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`text-xs font-extrabold rounded-full px-2.5 py-1 ${kindStyle.labelCls}`}>{kindStyle.label}</span>
          {expense.is_refunded && (
            <span className="text-xs font-extrabold rounded-full px-2.5 py-1 bg-rustbg text-rust">Refunded</span>
          )}
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{expense.description}</h1>
        <div className="text-[44px] leading-tight font-extrabold tracking-tight mt-1">{fmt(expense.amount)}</div>
        <div className="inline-flex items-center gap-1.5 text-sm text-muted font-medium mt-2">
          <CalendarDays size={15} />
          {new Date(expense.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white border border-[#e6e2d6] rounded-[20px] p-3.5 mb-4">
        <div className="w-11 h-11 rounded-full bg-tealbg text-teal flex items-center justify-center text-sm font-extrabold">
          {initials(expense.paid_by.username)}
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted font-semibold">Paid by</div>
          <div className="font-extrabold">{expense.paid_by.username}</div>
        </div>
        <div className="font-mono text-sm text-muted">{fmt(expense.amount)}</div>
      </div>

      {expense.notes && (
        <div className="bg-white border border-[#e6e2d6] rounded-[20px] p-4 mb-4">
          <div className="text-[13px] uppercase tracking-wider text-[#5f5a4d] font-extrabold mb-1">Notes</div>
          <p className="text-sm whitespace-pre-line">{expense.notes}</p>
        </div>
      )}

      {expense.receipts.length > 0 && (
        <div className="mb-4">
          <div className="text-[13px] uppercase tracking-wider text-[#5f5a4d] font-extrabold mb-2">
            Receipts ({expense.receipts.length})
          </div>
          <div className="grid grid-cols-2 gap-2">
            {expense.receipts.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer">
                <img src={r.url} alt="Receipt" className="rounded-[20px] border border-[#e6e2d6] w-full aspect-[3/4] object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="text-[13px] uppercase tracking-wider text-[#5f5a4d] font-extrabold mb-2">
        Split between {expense.splits.length} {expense.splits.length === 1 ? 'person' : 'people'}
      </div>
      <div className="bg-white border border-[#e6e2d6] rounded-[20px] divide-y divide-sand mb-6 overflow-hidden">
        {expense.splits.map((sp, idx) => {
          const pct = Math.max(0, Math.min(100, (Math.abs(parseFloat(sp.share)) / totalAbs) * 100))
          return (
            <div key={sp.user.id} className="px-3.5 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold ${AVATARS[idx % AVATARS.length]}`}>
                  {initials(sp.user.username)}
                </div>
                <span className="flex-1 font-bold text-[15px]">{sp.user.username}</span>
                <span className="font-mono text-[15px]">{fmt(sp.share)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-sand mt-2.5 overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {expense.kind !== 'refund' && (
        <>
          {expense.kind === 'expense' && !expense.is_refunded && (
            <div className="flex gap-2.5 mb-3">
              <button onClick={() => setEditing(true)} className="flex-1 h-[52px] rounded-2xl bg-teal text-white font-extrabold flex items-center justify-center gap-2">
                <Pencil size={17} /> Edit
              </button>
              <button onClick={handleRefund} className="flex-1 h-[52px] rounded-2xl border-[1.5px] border-teal text-teal font-bold flex items-center justify-center gap-2">
                <Undo2 size={17} /> Refund
              </button>
            </div>
          )}
          {expense.is_refunded && (
            <div className="text-center text-sm text-muted bg-sand rounded-2xl py-3 mb-3">
              This expense has been refunded
            </div>
          )}
          <button onClick={handleDelete} className="w-full h-[52px] rounded-2xl bg-rustbg text-rust font-bold flex items-center justify-center gap-2">
            <Trash2 size={17} /> Delete
          </button>
        </>
      )}
    </div>
  )
}
