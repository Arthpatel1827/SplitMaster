import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback((message, type = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => dismiss(id), type === 'error' ? 5000 : 3000)
  }, [dismiss])

  const toast = {
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto max-w-sm w-full flex items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-lg animate-[fadeIn_0.2s_ease-out] ${
              t.type === 'error' ? 'bg-rustbg text-rust border border-rust/30' : 'bg-ink text-paper'
            }`}
          >
            {t.type === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
