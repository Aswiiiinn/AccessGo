import LoadingSpinner from '@/components/LoadingSpinner'
import AccountPageShell from '@/features/account/components/AccountPageShell'
import ProfileForm from '@/features/account/components/ProfileForm'
import ChangeEmailForm from '@/features/account/components/ChangeEmailForm'
import { useFreshProfile } from '@/features/account/useFreshProfile'
import { useAuth } from '@/context/AuthContext'

export default function ProfilePage() {
  const { profile: fetched, loading, error, reload } = useFreshProfile()
  const { user } = useAuth()
  // The fetched profile is synced into AuthContext; read from there so later updates
  // (profile save, email change) are reflected immediately.
  const profile = fetched ? user ?? fetched : null

  return (
    <AccountPageShell title="My Profile" subtitle="Update how you appear on AccessGo.">
      {loading && <LoadingSpinner />}
      {!loading && error && (
        <div className="ag-notice ag-notice-danger justify-content-between align-items-center mb-3" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={reload}>Retry</button>
        </div>
      )}
      {!loading && profile && (
        <div className="d-flex flex-column gap-4">
          <section className="ag-card" aria-labelledby="profile-details-heading">
            <div className="ag-card-body">
              <h2 id="profile-details-heading" className="h5 mb-3">Profile details</h2>
              <ProfileForm key={profile.id} profile={profile} />
            </div>
          </section>
          <section className="ag-card" aria-labelledby="change-email-heading">
            <div className="ag-card-body">
              <h2 id="change-email-heading" className="h5 mb-1">Change email</h2>
              <p className="small text-muted">
                Current email: <span className="text-break">{profile.email}</span>. You'll use the new address to log in.
              </p>
              <ChangeEmailForm currentEmail={profile.email} />
            </div>
          </section>
        </div>
      )}
    </AccountPageShell>
  )
}
