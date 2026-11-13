import { useSearchParams } from 'react-router-dom'
import AuthCard from '@/components/account/AuthCard'
import ResetPasswordForm from '@/features/account/components/ResetPasswordForm'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()

  return (
    <AuthCard title="Choose a new password">
      <ResetPasswordForm uid={searchParams.get('uid')} token={searchParams.get('token')} />
    </AuthCard>
  )
}
