import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/features/auth/api'
import { parseApiError } from '@/lib/apiErrors'
import AuthCard from '@/components/account/AuthCard'
import PasswordInput from '@/components/account/PasswordInput'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  // Set by logout, password change/reset, or ProtectedRoute redirects.
  const { message: notice, from } = (location.state as { message?: string; from?: string } | null) ?? {}
  const { loginUser } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email address and password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const tokens = await authApi.login({ email: email.trim(), password })
      const profile = await loginUser(tokens.access, tokens.refresh)
      const isAdminUser = !!profile && (profile.role === 'admin' || profile.is_superuser)
      navigate(from && from.startsWith('/') && !from.startsWith('//') ? from : isAdminUser ? '/admin' : '/', { replace: true })
    } catch (err) {
      setError(parseApiError(err, 'Login failed. Please try again.').message)
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to report and verify accessibility barriers."
      footer={
        <>
          New to AccessGo? <Link to="/register" state={from ? { from } : undefined}>Create an account</Link>
        </>
      }
    >
      {notice && !error && <Notice tone="success" className="mb-3" role="status">{notice}</Notice>}
      {!notice && from && !error && <Notice tone="info" className="mb-3">Please log in to continue.</Notice>}
      {error && <Notice tone="danger" className="mb-3">{error}</Notice>}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">Email address</label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <PasswordInput label="Password" value={password} onChange={setPassword} autoComplete="current-password" required />
        <div className="d-flex justify-content-end mb-2" style={{ marginTop: -12 }}>
          <Link to="/forgot-password" state={email ? { email } : undefined} className="small d-inline-flex align-items-center" style={{ minHeight: 44 }}>Forgot password?</Link>
        </div>
        <LoadingButton type="submit" className="btn btn-primary btn-lg w-100" loading={loading} loadingText="Logging in…" icon={<LogIn size={18} aria-hidden="true" />}>
          Log in
        </LoadingButton>
      </form>
    </AuthCard>
  )
}
