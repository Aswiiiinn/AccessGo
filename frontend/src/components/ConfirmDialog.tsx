import { useEffect, useId, useState, type ReactNode } from 'react'
import Dialog from '@/components/ui/Dialog'
import LoadingButton from '@/components/ui/LoadingButton'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  /** When set, shows a textarea; `required` blocks confirmation until it has text. */
  reason?: { label: string; placeholder?: string; required?: boolean }
  busy?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
  onCancel: () => void
}

/** Confirmation for important or destructive actions, optionally collecting a reason. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  reason,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const reasonId = useId()
  const messageId = useId()

  useEffect(() => {
    if (open) {
      setText('')
      setTouched(false)
    }
  }, [open])

  const missingReason = !!reason?.required && text.trim().length === 0

  const submit = () => {
    setTouched(true)
    if (missingReason) return
    onConfirm(text.trim())
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      dismissible={!busy}
      describedBy={messageId}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <LoadingButton className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} loading={busy} onClick={submit}>
            {confirmLabel}
          </LoadingButton>
        </>
      }
    >
      <div id={messageId} className="mb-0">{message}</div>
      {reason && (
        <div className="mt-3">
          <label htmlFor={reasonId} className="form-label">
            {reason.label}
            {reason.required && <span className="ag-required" aria-hidden="true">*</span>}
          </label>
          <textarea
            id={reasonId}
            className={`form-control${touched && missingReason ? ' is-invalid' : ''}`}
            rows={3}
            value={text}
            placeholder={reason.placeholder}
            onChange={(e) => setText(e.target.value)}
            aria-required={reason.required}
            aria-invalid={touched && missingReason}
            aria-describedby={touched && missingReason ? `${reasonId}-err` : undefined}
          />
          {touched && missingReason && (
            <div id={`${reasonId}-err`} className="invalid-feedback">Please enter a reason.</div>
          )}
        </div>
      )}
      {error && <div className="ag-notice ag-notice-danger mt-3" role="alert">{error}</div>}
    </Dialog>
  )
}
