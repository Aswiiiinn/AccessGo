import LoadingSpinner from '@/components/LoadingSpinner'
import AccountPageShell from '@/features/account/components/AccountPageShell'
import AccountSettings from '@/features/account/components/AccountSettings'
import { useFreshProfile } from '@/features/account/useFreshProfile'

export default function AccountSettingsPage() {
  const { profile, loading, error, reload } = useFreshProfile()

  return (
    <AccountPageShell title="Account Settings">
      {loading && <LoadingSpinner />}
      {!loading && error && (
        <div className="ag-notice ag-notice-danger justify-content-between align-items-center mb-3" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={reload}>Retry</button>
        </div>
      )}
      {!loading && profile && <AccountSettings profile={profile} />}
    </AccountPageShell>
  )
}
