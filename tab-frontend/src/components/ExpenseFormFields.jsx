import { Camera, Check } from 'lucide-react'

export const MAX_RECEIPTS = 5

const AVATARS = ['bg-tealbg text-teal', 'bg-rustbg text-rust', 'bg-sand text-[#5f5a4d]', 'bg-ink text-paper']
const label = 'text-[13px] uppercase tracking-wider text-[#5f5a4d] font-extrabold mb-2'
const field = 'w-full h-[54px] px-4 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors'

const SPLIT_TYPES = [
  { id: 'equal', label: 'Equal' },
  { id: 'exact', label: 'Exact' },
  { id: 'percent', label: 'Percent' },
  { id: 'shares', label: 'Shares' },
]

/** Shared form body for adding and editing an expense. State lives in the parent. */
export default function ExpenseFormFields({
  members, description, setDescription, amount, setAmount, paidBy, setPaidBy,
  splitAmong, toggleMember, splitType, setSplitType, shares, setShares,
  notes, setNotes, receipts, onAddFiles, onRemoveReceipt,
}) {
  const selected = members.filter((m) => splitAmong.includes(m.id))
  const total = selected.reduce((sum, m) => sum + (parseFloat(shares[m.id]) || 0), 0)
  const target = splitType === 'percent' ? 100 : splitType === 'exact' ? parseFloat(amount) || 0 : null
  const mismatch = target !== null && Math.abs(total - target) > 0.01

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#e6e2d6] rounded-[24px] px-5 py-5 text-center">
        <label htmlFor="exp-amount" className="text-xs font-bold text-muted">Amount</label>
        <div className="flex items-center justify-center gap-1 mt-1">
          <span className="text-4xl font-extrabold text-muted">$</span>
          <input
            id="exp-amount"
            type="number" step="0.01" inputMode="decimal"
            className="w-44 text-5xl font-extrabold tracking-tight text-center outline-none bg-transparent placeholder:text-[#cfcab9]"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="exp-desc" className={`block ${label}`}>What was it for?</label>
        <input id="exp-desc" className={field} placeholder="Dinner, groceries, taxi..." value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div>
        <label htmlFor="exp-paid" className={`block ${label}`}>Paid by</label>
        <select id="exp-paid" className={field} value={paidBy} onChange={(e) => setPaidBy(Number(e.target.value))}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.username}</option>)}
        </select>
      </div>

      <div>
        <div className={label}>Split among</div>
        <div className="bg-white border border-[#e6e2d6] rounded-[20px] divide-y divide-sand overflow-hidden">
          {members.map((m, i) => {
            const on = splitAmong.includes(m.id)
            return (
              <label key={m.id} className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${on ? 'bg-tealbg/60' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold ${AVATARS[i % AVATARS.length]}`}>
                  {m.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 font-bold text-[15px]">{m.username}</span>
                <input type="checkbox" checked={on} onChange={() => toggleMember(m.id)} className="sr-only" />
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${on ? 'bg-teal border-teal text-white' : 'border-[#cfcab9]'}`} aria-hidden="true">
                  {on && <Check size={14} strokeWidth={3.5} />}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <div className={label}>How to split</div>
        <div className="flex bg-sand rounded-2xl p-1" role="tablist">
          {SPLIT_TYPES.map((t) => (
            <button
              type="button" key={t.id} role="tab" aria-selected={splitType === t.id}
              onClick={() => setSplitType(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-[13px] ${splitType === t.id ? 'bg-white font-extrabold text-ink' : 'font-semibold text-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {splitType !== 'equal' && selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-white border border-[#e6e2d6] rounded-2xl px-4 h-[52px]">
              <span className="flex-1 text-[15px] font-bold">{m.username}</span>
              {splitType === 'exact' && <span className="text-muted font-mono">$</span>}
              <input
                type="number" step="0.01" inputMode="decimal"
                aria-label={`${m.username} ${splitType}`}
                className="w-20 text-right font-mono outline-none"
                placeholder={splitType === 'shares' ? '1' : '0'}
                value={shares[m.id] || ''}
                onChange={(e) => setShares({ ...shares, [m.id]: e.target.value })}
              />
              {splitType === 'percent' && <span className="text-muted font-mono">%</span>}
            </div>
          ))}
          <div className={`text-xs font-semibold px-1 ${mismatch ? 'text-rust' : 'text-muted'}`}>
            {splitType === 'percent' && `Total: ${total}% of 100%`}
            {splitType === 'exact' && `Total: $${total.toFixed(2)} of $${(target || 0).toFixed(2)}`}
            {splitType === 'shares' && `${total} shares in total`}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="exp-notes" className={`block ${label}`}>Notes</label>
        <textarea
          id="exp-notes" rows={3}
          className="w-full px-4 py-3 rounded-2xl border-[1.5px] border-line bg-white outline-none focus:border-ink transition-colors resize-none"
          placeholder="Add a note (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <div className={label}>Receipts ({receipts.length}/{MAX_RECEIPTS})</div>
        {receipts.length < MAX_RECEIPTS && (
          <label className="flex items-center justify-center gap-2 h-[54px] rounded-2xl border-[1.5px] border-dashed border-[#cfcab9] bg-white cursor-pointer text-sm font-semibold text-muted">
            <Camera size={18} />
            {receipts.length ? 'Add another photo' : 'Add receipt photos'}
            <input
              type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { onAddFiles(Array.from(e.target.files)); e.target.value = '' }}
            />
          </label>
        )}
        {receipts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {receipts.map((r) => (
              <div key={r.key} className="relative aspect-square">
                <img src={r.url} alt="Receipt" className="w-full h-full object-cover rounded-2xl border border-[#e6e2d6]" />
                <button
                  type="button" aria-label="Remove receipt photo" onClick={() => onRemoveReceipt(r.key)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-ink/80 text-white flex items-center justify-center text-lg"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
