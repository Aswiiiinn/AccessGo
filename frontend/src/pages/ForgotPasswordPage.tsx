import { useLocation } from 'react-router-dom'
import AuthCard from '@/components/account/AuthCard'
import ForgotPasswordForm from '@/features/account/components/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  const location = useLocation()
  const initialEmail = (location.state as { email?: string } | null)?.email ?? ''

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a secure link to choose a new one.">
      <ForgotPasswordForm initialEmail={initialEmail} />
    </AuthCard>
  )
}
