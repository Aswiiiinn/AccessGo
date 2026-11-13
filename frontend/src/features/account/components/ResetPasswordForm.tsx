import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api'
import { parseApiError, type FieldErrors } from '@/lib/apiErrors'
import PasswordInput from '@/components/account/PasswordInput'
import PasswordRequirements from '@/components/account/PasswordRequirements'

type LinkState = 'checking' | 'valid' | 'invalid' | 'unreachable'

const INVALID_LINK_MESSAGE =
  'This password reset link is invalid, has expired, or has already been used. Please request a new one.'
const REDIRECT_DELAY_MS = 3000

interface ResetPasswordFormProps {
  uid: string | null
  token: string | null
}

/**
 * Validates the uid/token with POST /auth/reset-password/validate/, then submits the new
 * password to POST /auth/reset-password/confirm/. The token is only held in memory; the
 * server re-validates it on submit, so the pre-check is purely for UX.
 */
export default function ResetPasswordForm({ uid, token }: ResetPasswordFormProps) {
  const navigate = useNavigate()
  const [linkState, setLinkState] = useState<LinkState>(uid && token ? 'checking' : 'invalid')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [done, setDone] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!uid || !token) {
      setLinkState('invalid')
      return
    }
    let cancelled = false
    setLinkState('checking')
    authApi
      .validateResetToken({ uid, token })
      .then(() => !cancelled && setLinkState('valid'))
      .catch((err) => {
        if (cancelled) return
        const parsed = parseApiError(err)
        setLinkState(parsed.status === null || parsed.status >= 500 || parsed.status === 429 ? 'unreachable' : 'invalid')
        if (parsed.status === 429) setError(parsed.message)
      })
    return () => {
      cancelled = true
    }
  }, [uid, token, attempt])

  useEffect(() => {
    if (!done) return
    const timer = setTimeout(
      () => navigate('/login', { replace: true, state: { message: 'Your password has been reset. Please log in.' } }),
      REDIRECT_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [done, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!uid || !token) return
    setError(null)
    const errs: FieldErrors = {}
    if (!newPassword) errs.new_password = ['Enter a new password.']
    else if (newPassword.length < 8) errs.new_password = ['Password must contain at least 8 characters.']
    if (!confirmPassword) errs.re_new_password = ['Confirm your new password.']
    else if (newPassword !== confirmPassword) errs.re_new_password = ['Passwords do not match.']
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      await authApi.resetPasswordConfirm({ uid, token, new_password: newPassword, re_new_password: confirmPassword })
      setNewPassword('')
      setConfirmPassword('')
      setDone(true)
    } catch (err) {
      const parsed = parseApiError(err, 'Could not reset your password. Please try again.')
      if (parsed.fieldErrors.token?.length || parsed.fieldErrors.uid?.length) {
        setLinkState('invalid')
      } else {
        setError(parsed.message)
        setFieldErrors(parsed.fieldErrors)
      }
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="ag-notice ag-notice-success mb-3" role="status">
        Your password has been reset. Redirecting you to the login page…{' '}
        <Link to="/login" replace>Log in now</Link>
      </div>
    )
  }

  if (linkState === 'checking') {
    return (
      <div className="d-flex align-items-center gap-2 text-muted" role="status">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" /> Checking your reset link…
      </div>
    )
  }

  if (linkState === 'invalid') {
    return (
      <>
        <div className="ag-notice ag-notice-danger mb-3" role="alert">{INVALID_LINK_MESSAGE}</div>
        <Link to="/forgot-password" className="btn btn-primary w-100">Request a new link</Link>
        <div className="text-center mt-3">
          <Link to="/login" className="text-decoration-none">Back to Login</Link>
        </div>
      </>
    )
  }

  if (linkState === 'unreachable') {
    return (
      <>
        <div className="ag-notice ag-notice-warning mb-3" role="alert">
          {error ?? 'We could not verify your reset link right now. Check your connection and try again.'}
        </div>
        <button type="button" className="btn btn-outline-primary w-100" onClick={() => { setError(null); setAttempt((n) => n + 1) }}>
          Try again
        </button>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="ag-notice ag-notice-danger mb-3" role="alert">{error}</div>}
      <p className="text-muted small mb-3">Choose a new password for your account.</p>
      <fieldset disabled={saving}>
        <PasswordInput
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          errors={fieldErrors.new_password}
          helpId="reset-password-requirements"
          autoFocus
          required
        />
        <PasswordRequirements password={newPassword} id="reset-password-requirements" />
        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          errors={fieldErrors.re_new_password}
          required
        />
        <button type="submit" className="btn btn-primary w-100">
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {saving ? 'Resetting…' : 'Reset password'}
        </button>
      </fieldset>
      <div className="text-center mt-3">
        <Link to="/login" className="text-decoration-none">Back to Login</Link>
      </div>
    </form>
  )
}
