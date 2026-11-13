import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleCheck, CircleAlert, Info } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }
const DURATION_MS = 5000

/** Lightweight toast notifications announced through an ARIA live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++
    setToasts((t) => [...t.slice(-2), { id, tone, message }])
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ag-toasts" role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false" className="d-flex flex-column gap-2">
          {toasts.map((t) => (
            <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = ICONS[item.tone]
  const [paused, setPaused] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss
  useEffect(() => {
    if (paused) return
    const t = window.setTimeout(() => dismissRef.current(), DURATION_MS)
    return () => window.clearTimeout(t)
  }, [paused])
  return (
    <div
      className={`ag-toast ag-toast-${item.tone}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon size={18} className="ag-toast-icon" aria-hidden="true" />
      <div className="flex-grow-1">{item.message}</div>
      <button type="button" className="btn-close" aria-label="Dismiss notification" onClick={onDismiss} />
    </div>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
