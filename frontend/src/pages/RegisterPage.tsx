import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/features/auth/api'
import { parseApiError, type FieldErrors } from '@/lib/apiErrors'
import AuthCard from '@/components/account/AuthCard'
import PasswordInput from '@/components/account/PasswordInput'
import PasswordRequirements from '@/components/account/PasswordRequirements'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'
import { EMAIL_PATTERN } from '@/features/account/components/ChangeEmailForm'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const { loginUser } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!email.trim()) errs.email = ['Enter your email address.']
    else if (!EMAIL_PATTERN.test(email.trim())) errs.email = ['Enter a valid email address.']
    if (!password) errs.password = ['Choose a password.']
    else if (password.length < 8) errs.password = ['Password must contain at least 8 characters.']
    if (password && confirm !== password) errs.confirm = ['Passwords do not match.']
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await authApi.register({ email: email.trim(), full_name: fullName.trim(), password })
      const tokens = await authApi.login({ email: email.trim(), password })
      await loginUser(tokens.access, tokens.refresh)
      navigate(from && from.startsWith('/') && !from.startsWith('//') ? from : '/', { replace: true })
    } catch (err) {
      const parsed = parseApiError(err, 'Registration failed. Please try again.')
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setLoading(false)
    }
  }

  const emailErr = fieldErrors.email?.join(' ')

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join the community making journeys more accessible."
      footer={
        <>
          Already have an account? <Link to="/login" state={from ? { from } : undefined}>Log in</Link>
        </>
      }
    >
      {error && <Notice tone="danger" className="mb-3">{error}</Notice>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="reg-name" className="form-label">Full name <span className="text-muted fw-normal">(optional)</span></label>
          <input id="reg-name" type="text" autoComplete="name" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="mb-3">
          <label htmlFor="reg-email" className="form-label">
            Email address<span className="ag-required" aria-hidden="true">*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            className={`form-control${emailErr ? ' is-invalid' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-required="true"
            aria-invalid={!!emailErr}
            aria-describedby={emailErr ? 'reg-email-error' : undefined}
          />
          {emailErr && <div id="reg-email-error" className="invalid-feedback">{emailErr}</div>}
        </div>
        <PasswordInput label="Password" value={password} onChange={setPassword} autoComplete="new-password" errors={fieldErrors.password} helpId="reg-password-req" required />
        <PasswordRequirements password={password} id="reg-password-req" />
        <PasswordInput label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" errors={fieldErrors.confirm} required />
        <LoadingButton type="submit" className="btn btn-primary btn-lg w-100" loading={loading} loadingText="Creating account…" icon={<UserPlus size={18} aria-hidden="true" />}>
          Create account
        </LoadingButton>
      </form>
    </AuthCard>
  )
}
