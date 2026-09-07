import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Tesseract from 'tesseract.js'
import client from '../api/client'
import { scanReceiptTotal } from '../utils/scanReceipt'
import { Receipt, Check, Undo2 } from 'lucide-react'

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

  // edit form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitAmong, setSplitAmong] = useState([])
  const [splitType, setSplitType] = useState('equal')
  const [shares, setShares] = useState({})
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
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
    setPreview(e.data.receipt || null)
  }

  useEffect(() => { load() }, [code, id])

  if (!group || !expense) return <div className="max-w-md mx-auto px-5 py-6">Loading...</div>

  const members = group.members
  const selectedMembers = members.filter((m) => splitAmong.includes(m.id))
  const toggleMember = (mid) => {
    setSplitAmong((prev) => (prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]))
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setReceiptFile(file)
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng')
      const amt = scanReceiptTotal(text)
      if (amt) setAmount(amt)
    } catch {
      // non-fatal
    } finally {
      setScanning(false)
    }
  }

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
      if (receiptFile) form.append('receipt', receiptFile)

      await client.put(`/groups/${code}/expenses/${id}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEditing(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this expense? This cannot be undone.')) return
    await client.delete(`/groups/${code}/expenses/${id}/`)
    navigate(`/groups/${code}`)
  }

  const handleRefund = async () => {
    if (!confirm("Refund this expense? This reverses the split for everyone in one step.")) return
    await client.post(`/groups/${code}/expenses/${id}/refund/`)
    load()
  }

  if (editing) {
    return (
      <div className="max-w-md mx-auto px-5 py-6">
        <button onClick={() => setEditing(false)} className="text-muted text-sm">&larr; Cancel</button>
        <h1 className="text-2xl font-bold mt-2 mb-6">Edit expense</h1>

        <form onSubmit={handleSave} className="space-y-4">
          <input
            className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="number" step="0.01"
            className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Paid by</div>
            <select
              className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none"
              value={paidBy}
              onChange={(e) => setPaidBy(Number(e.target.value))}
            >
              {members.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Split among</div>
            <div className="bg-white border border-line rounded-2xl divide-y divide-line">
              {members.map((m) => (
                <label key={m.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
                  splitAmong.includes(m.id) ? 'bg-tealbg' : ''
                }`}>
                  <input
                    type="checkbox"
                    checked={splitAmong.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1 font-medium text-sm">{m.username}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Split type</div>
            <div className="flex gap-2">
              {['equal', 'exact', 'percent', 'shares'].map((t) => (
                <button
                  type="button" key={t}
                  onClick={() => setSplitType(t)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold capitalize ${
                    splitType === t ? 'bg-ink text-paper border-ink' : 'border-line'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {splitType !== 'equal' && selectedMembers.length > 0 && (
            <div className="space-y-2">
              {selectedMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-white border border-line rounded-xl px-4 py-2.5">
                  <span className="flex-1 text-sm font-medium">{m.username}</span>
                  <input
                    type="number" step="0.01"
                    className="w-20 text-right font-mono text-sm outline-none"
                    value={shares[m.id] || ''}
                    onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Notes</div>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Receipt photo</div>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-line bg-white cursor-pointer">
              <span className="text-sm text-muted">{scanning ? 'Scanning...' : preview ? 'Photo attached — tap to change' : 'Tap to attach a photo'}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </label>
            {preview && <img src={preview} className="rounded-xl max-h-40 w-auto mt-2" />}
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}

          <button type="submit" disabled={saving} className="w-full bg-ink text-paper font-semibold py-3 rounded-xl disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 py-6">
      <Link to={`/groups/${code}`} className="text-muted text-sm">&larr; {group.name}</Link>

      <div className="text-center mt-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-paper2 flex items-center justify-center mx-auto mb-3 text-2xl">
          {expense.kind === 'payment' ? <Check size={26} className="text-teal" /> : expense.kind === 'refund' ? <Undo2 size={26} className="text-rust" /> : <Receipt size={26} />}
        </div>
        <h1 className="text-2xl font-bold">{expense.description}</h1>
        <div className="text-3xl font-bold font-mono mt-1">${expense.amount}</div>
        <div className="text-sm text-muted mt-1">{new Date(expense.created_at).toLocaleString()}</div>
      </div>

      <div className="bg-white border border-line rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-tealbg flex items-center justify-center text-xs font-semibold text-teal">
            {initials(expense.paid_by.username)}
          </div>
          <div>
            <div className="text-xs text-muted">Paid by</div>
            <div className="font-semibold">{expense.paid_by.username}</div>
          </div>
        </div>
      </div>

      {expense.notes && (
        <div className="bg-white border border-line rounded-2xl p-4 mb-4">
          <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-1">Notes</div>
          <p className="text-sm whitespace-pre-line">{expense.notes}</p>
        </div>
      )}

      {expense.receipt && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Receipt</div>
          <a href={expense.receipt} target="_blank" rel="noreferrer">
            <img src={expense.receipt} className="rounded-2xl border border-line w-full" />
          </a>
        </div>
      )}

      <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">
        Split between {expense.splits.length} {expense.splits.length === 1 ? 'person' : 'people'}
      </div>
      <div className="bg-white border border-line rounded-2xl divide-y divide-line mb-6">
        {expense.splits.map((s) => (
          <div key={s.user.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-paper2 flex items-center justify-center text-xs font-semibold">
                {initials(s.user.username)}
              </div>
              <span className="font-medium">{s.user.username}</span>
            </div>
            <span className="font-mono font-semibold">${s.share}</span>
          </div>
        ))}
      </div>

      {expense.kind === 'expense' && (
        <>
          {expense.is_refunded ? (
            <div className="text-center text-sm text-muted bg-paper2 rounded-xl py-3 mb-3">
              This expense has been refunded
            </div>
          ) : (
            <button
              onClick={handleRefund}
              className="w-full text-teal font-semibold py-3 rounded-xl border border-teal mb-3"
            >
              Refund this expense
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)} className="flex-1 bg-ink text-paper font-semibold py-3 rounded-xl">
              Edit
            </button>
            <button onClick={handleDelete} className="flex-1 text-rust font-semibold py-3 rounded-xl border border-line">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}