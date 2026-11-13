import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/features/auth/api'
import { parseApiError } from '@/lib/apiErrors'
import { EMAIL_PATTERN } from './ChangeEmailForm'

// Must not depend on whether the address exists — the backend returns the same response either way.
const GENERIC_SUCCESS = 'If an account with that email exists, a password reset link has been sent. Please check your inbox.'

/** POST /auth/forgot-password/ */
export default function ForgotPasswordForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const value = email.trim()
    if (!value) return setEmailError('Email address is required.')
    if (!EMAIL_PATTERN.test(value)) return setEmailError('Enter a valid email address.')
    setEmailError(null)

    setLoading(true)
    try {
      await authApi.forgotPassword({ email: value })
      setSent(true)
    } catch (err) {
      const parsed = parseApiError(err, 'Could not send the reset link. Please try again.')
      if (parsed.fieldErrors.email?.length) setEmailError(parsed.fieldErrors.email.join(' '))
      else setError(parsed.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <>
        <div className="ag-notice ag-notice-success mb-3" role="status">{GENERIC_SUCCESS}</div>
        <p className="small text-muted">
          The link expires after a short time and can only be used once. Didn't get it? Check your spam folder or{' '}
          <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setSent(false)}>
            try again
          </button>
          .
        </p>
        <div className="text-center mt-3">
          <Link to="/login" className="text-decoration-none">Back to Login</Link>
        </div>
      </>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="ag-notice ag-notice-danger mb-3" role="alert">{error}</div>}
      <p className="text-muted small mb-3">
        Enter your registered email address and we will send you a link to reset your password.
      </p>
      <fieldset disabled={loading}>
        <div className="mb-3">
          <label htmlFor="forgot-email" className="form-label">Email address</label>
          <input
            id="forgot-email"
            type="email"
            className={`form-control${emailError ? ' is-invalid' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'forgot-email-error' : undefined}
          />
          {emailError && <div id="forgot-email-error" className="invalid-feedback">{emailError}</div>}
        </div>
        <button type="submit" className="btn btn-primary w-100">
          {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </fieldset>
      <div className="text-center mt-3">
        <Link to="/login" className="text-decoration-none">Back to Login</Link>
      </div>
    </form>
  )
}
