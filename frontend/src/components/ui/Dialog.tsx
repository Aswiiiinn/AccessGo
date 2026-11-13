import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type DialogVariant = 'sheet' | 'full'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Optional element rendered before the title (e.g. a back button). */
  headerStart?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /**
   * `sheet` (default): bottom sheet on phones, centred dialog from 768px.
   * `full`: full-screen on phones for substantial content, centred dialog from 768px.
   */
  variant?: DialogVariant
  size?: 'md' | 'lg'
  /** Element to focus first; defaults to the first focusable element in the body. */
  initialFocusRef?: React.RefObject<HTMLElement>
  /** Prevent closing via Escape/backdrop (e.g. while a request is in flight). */
  dismissible?: boolean
  className?: string
  describedBy?: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

let openCount = 0

/**
 * Accessible modal dialog: role="dialog" + aria-modal, labelled by its title,
 * focus trapped inside, Escape and backdrop close, background scroll locked,
 * focus restored to the trigger on close. Rendered in a portal.
 */
export default function Dialog({
  open,
  onClose,
  title,
  headerStart,
  children,
  footer,
  variant = 'sheet',
  size = 'md',
  initialFocusRef,
  dismissible = true,
  className = '',
  describedBy,
}: DialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const dismissibleRef = useRef(dismissible)
  dismissibleRef.current = dismissible

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    openCount += 1
    document.body.classList.add('ag-scroll-locked')

    const focusTimer = window.setTimeout(() => {
      const body = dialogRef.current?.querySelector<HTMLElement>('.ag-dialog-body')
      const target = initialFocusRef?.current ?? body?.querySelector<HTMLElement>(FOCUSABLE) ?? dialogRef.current
      target?.focus()
    }, 30)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissibleRef.current) {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      openCount -= 1
      if (openCount <= 0) {
        openCount = 0
        document.body.classList.remove('ag-scroll-locked')
      }
      previouslyFocused?.focus?.()
    }
  }, [open, initialFocusRef])

  if (!open) return null

  return createPortal(
    <div
      className="ag-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissible) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`ag-dialog${variant === 'full' ? ' ag-dialog-full' : ''}${size === 'lg' ? ' ag-dialog-lg' : ''} ${className}`}
      >
        {variant === 'sheet' && <div className="ag-dialog-handle" aria-hidden="true" />}
        <div className="ag-dialog-header">
          {headerStart}
          <h2 id={titleId} className="ag-dialog-title">{title}</h2>
          {dismissible && (
            <button type="button" className="btn-close" aria-label="Close dialog" onClick={onClose} style={{ width: 32, height: 32 }} />
          )}
        </div>
        <div className="ag-dialog-body">{children}</div>
        {footer && <div className="ag-dialog-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
