import { Link } from 'react-router-dom'
import AccountPageShell from '@/features/account/components/AccountPageShell'
import ChangePasswordForm from '@/features/account/components/ChangePasswordForm'

export default function ChangePasswordPage() {
  return (
    <AccountPageShell title="Change Password" subtitle="Keep your account secure with a strong, unique password.">
      <section className="ag-card" style={{ maxWidth: 520 }}>
        <div className="ag-card-body">
          <ChangePasswordForm />
          <p className="small text-muted mt-3 mb-0">
            Forgot your current password? <Link to="/forgot-password">Reset it by email</Link>.
          </p>
        </div>
      </section>
    </AccountPageShell>
  )
}
