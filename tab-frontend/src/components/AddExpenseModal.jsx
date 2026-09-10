import { useState, useEffect } from 'react'
import Tesseract from 'tesseract.js'
import { X, Sparkles } from 'lucide-react'
import client from '../api/client'
import { scanReceiptTotal } from '../utils/scanReceipt'
import Spinner from './Spinner'

export default function AddExpenseModal({ code, members, onClose, onSaved }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(members[0]?.id || '')
  const [splitAmong, setSplitAmong] = useState(members.map((m) => m.id))
  const [splitType, setSplitType] = useState('equal')
  const [shares, setShares] = useState({})
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const toggleMember = (id) => {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const selectedMembers = members.filter((m) => splitAmong.includes(m.id))
  const shareTotal = selectedMembers.reduce((sum, m) => sum + (parseFloat(shares[m.id]) || 0), 0)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setReceiptFile(file)
    setPreview(URL.createObjectURL(file))
    setScanning(true)
    setScanned(false)
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng')
      const amt = scanReceiptTotal(text)
      if (amt) {
        setAmount(amt)
        setScanned(true)
      }
    } catch {
      // OCR failure is non-fatal, user can still type the amount manually
    } finally {
      setScanning(false)
    }
  }

  const removePhoto = () => {
    setReceiptFile(null)
    setPreview(null)
    setScanned(false)
  }

  const handleSubmit = async (e) => {
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

      await client.post(`/groups/${code}/expenses/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-end justify-center z-30 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-paper w-full max-w-md rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto transition-transform duration-200 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Add an expense</h2>
          <button onClick={handleClose} className="text-muted hover:text-ink transition-colors">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="number" step="0.01"
            className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Paid by</div>
            <select
              className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
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
                <label key={m.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  splitAmong.includes(m.id) ? 'bg-tealbg' : 'hover:bg-paper2'
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
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold capitalize transition-colors ${
                    splitType === t ? 'bg-ink text-paper border-ink' : 'border-line hover:border-ink'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {splitType !== 'equal' && selectedMembers.length > 0 && (
            <div className="space-y-2 animate-[fadeIn_0.2s_ease-out]">
              <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-1">
                {splitType === 'exact' ? 'Amount per person' : splitType === 'percent' ? 'Percent per person' : 'Shares per person'}
              </div>
              {selectedMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-white border border-line rounded-xl px-4 py-2.5">
                  <span className="flex-1 text-sm font-medium">{m.username}</span>
                  <input
                    type="number" step="0.01"
                    className="w-20 text-right font-mono text-sm outline-none"
                    placeholder={splitType === 'shares' ? '1' : '0'}
                    value={shares[m.id] || ''}
                    onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })}
                  />
                </div>
              ))}
              <div className="text-xs text-muted px-1">
                Total: {splitType === 'percent' ? `${shareTotal}%` : shareTotal}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Notes</div>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-line bg-white outline-none focus:border-ink transition-colors"
              rows={3}
              placeholder="Add a note (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted font-semibold mb-2">Receipt photo</div>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-line bg-white cursor-pointer hover:border-ink transition-colors">
              {scanning && <Spinner size={18} />}
              <span className="text-sm text-muted">
                {scanning ? 'Scanning receipt...' : preview ? 'Photo attached — tap to change' : 'Tap to attach a photo'}
              </span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </label>
            {preview && (
              <div className="relative mt-2 inline-block animate-[fadeIn_0.2s_ease-out]">
                <img src={preview} className="rounded-xl max-h-40 w-auto" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-ink/80 text-white flex items-center justify-center hover:bg-ink transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {scanned && (
              <p className="text-xs text-teal mt-1 flex items-center gap-1 animate-[fadeIn_0.2s_ease-out]">
                <Sparkles size={12} /> Amount filled in from receipt — double check it's correct.
              </p>
            )}
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}

          <button
            type="submit" disabled={saving}
            className="w-full bg-ink text-paper font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
          >
            {saving && <Spinner size={18} className="text-paper" />}
            {saving ? 'Saving...' : 'Add expense'}
          </button>
        </form>
      </div>
    </div>
  )
}