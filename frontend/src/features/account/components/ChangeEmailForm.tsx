import { useState, type FormEvent } from 'react'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/context/AuthContext'
import { parseApiError, type FieldErrors } from '@/lib/apiErrors'
import PasswordInput from '@/components/account/PasswordInput'

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST /auth/change-email/ — requires the current password. */
export default function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const { refreshUser } = useAuth()
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const email = newEmail.trim()
    const errs: FieldErrors = {}
    if (!email) errs.new_email = ['Email address is required.']
    else if (!EMAIL_PATTERN.test(email)) errs.new_email = ['Enter a valid email address.']
    else if (email.toLowerCase() === currentEmail.toLowerCase()) errs.new_email = ['This is already your email address.']
    if (!password) errs.password = ['Enter your current password to confirm.']
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const res = await authApi.changeEmail({ new_email: email, password })
      await refreshUser()
      setSuccess(res.detail || 'Email changed successfully.')
      setNewEmail('')
    } catch (err) {
      const parsed = parseApiError(err, 'Could not change your email. Please try again.')
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setPassword('')
      setSaving(false)
    }
  }

  const emailInvalid = !!fieldErrors.new_email?.length

  return (
    <form onSubmit={handleSubmit} noValidate>
      {success && <div className="ag-notice ag-notice-success mb-3" role="status">{success}</div>}
      {error && <div className="ag-notice ag-notice-danger mb-3" role="alert">{error}</div>}
      <fieldset disabled={saving}>
        <div className="mb-3">
          <label htmlFor="new-email" className="form-label">New email address</label>
          <input
            id="new-email"
            type="email"
            className={`form-control${emailInvalid ? ' is-invalid' : ''}`}
            value={newEmail}
            autoComplete="email"
            onChange={(e) => setNewEmail(e.target.value)}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? 'new-email-error' : undefined}
          />
          {emailInvalid && <div id="new-email-error" className="invalid-feedback">{fieldErrors.new_email.join(' ')}</div>}
        </div>
        <PasswordInput
          label="Current password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          errors={fieldErrors.password}
        />
        <button type="submit" className="btn btn-outline-primary">
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          Change email
        </button>
      </fieldset>
    </form>
  )
}
