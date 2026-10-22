import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

/**
 * const confirm = useConfirm()
 * if (!(await confirm({ title, message, confirmLabel, danger: true }))) return
 */
export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve
    setDialog(options)
  }), [])

  const close = (result) => {
    resolver.current?.(result)
    resolver.current = null
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-5 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="bg-paper rounded-2xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-lg font-bold">{dialog.title || 'Are you sure?'}</h2>
            {dialog.message && <p className="text-sm text-muted mt-2">{dialog.message}</p>}
            <div className="flex gap-3 mt-5">
              <button
                autoFocus
                onClick={() => close(false)}
                className="flex-1 py-3 rounded-xl border border-line font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 py-3 rounded-xl font-semibold ${
                  dialog.danger ? 'bg-rust text-white' : 'bg-ink text-paper'
                }`}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)
