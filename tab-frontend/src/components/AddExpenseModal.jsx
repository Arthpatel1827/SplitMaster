import { useState, useEffect } from 'react'
import Tesseract from 'tesseract.js'
import { X } from 'lucide-react'
import client from '../api/client'
import { scanReceiptTotal } from '../utils/scanReceipt'
import { getErrorMessage } from '../utils/errors'
import ExpenseFormFields from './ExpenseFormFields'
import { useToast } from '../context/ToastContext'

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
  const toast = useToast()
  const [visible, setVisible] = useState(false)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const toggleMember = (id) => {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }


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
      toast.success('Expense added')
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save expense.'))
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
        className={`bg-paper w-full max-w-md rounded-t-[28px] px-5 pt-3 pb-8 max-h-[85vh] overflow-y-auto transition-transform duration-200 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-[#cfcab9] mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">Add an expense</h2>
          <button onClick={handleClose} className="text-muted hover:text-ink transition-colors">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ExpenseFormFields
            members={members}
            description={description} setDescription={setDescription}
            amount={amount} setAmount={setAmount}
            paidBy={paidBy} setPaidBy={setPaidBy}
            splitAmong={splitAmong} toggleMember={toggleMember}
            splitType={splitType} setSplitType={setSplitType}
            shares={shares} setShares={setShares}
            notes={notes} setNotes={setNotes}
            preview={preview} scanning={scanning} scanned={scanned}
            onFile={handleFile} onRemovePhoto={removePhoto}
          />
          {error && <p className="text-rust text-sm">{error}</p>}
          <button
            type="submit" disabled={saving}
            className="w-full bg-teal text-white font-extrabold h-[54px] rounded-2xl disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add expense'}
          </button>
        </form>
      </div>
    </div>
  )
}