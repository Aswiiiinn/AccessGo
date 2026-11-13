import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getDisplayName } from '@/components/account/UserAvatar'
import type { UserProfile } from '@/types'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

/** Read-only overview with links to the editing pages. Only shows fields the API returns. */
export default function AccountSettings({ profile }: { profile: UserProfile }) {
  const { logoutUser, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutUser()
    } finally {
      navigate('/login', { replace: true, state: { message: 'You have been logged out.' } })
    }
  }

  return (
    <div className="d-flex flex-column gap-4">
      <section className="ag-card" aria-labelledby="settings-personal">
        <div className="ag-card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
            <h2 id="settings-personal" className="h5 mb-0">Personal information</h2>
            <Link to="/profile" className="btn btn-sm btn-outline-primary">Edit profile</Link>
          </div>
          <dl className="row mb-0">
            <dt className="col-sm-4 text-muted fw-normal">Name</dt>
            <dd className="col-sm-8">{getDisplayName(profile)}</dd>
            <dt className="col-sm-4 text-muted fw-normal">Username</dt>
            <dd className="col-sm-8">{profile.username}</dd>
            <dt className="col-sm-4 text-muted fw-normal">Email</dt>
            <dd className="col-sm-8 mb-0 text-break">{profile.email}</dd>
          </dl>
        </div>
      </section>

      <section className="ag-card" aria-labelledby="settings-security">
        <div className="ag-card-body">
          <h2 id="settings-security" className="h5 mb-3">Security</h2>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 pb-3 border-bottom">
            <div>
              <div className="fw-semibold">Password</div>
              <div className="small text-muted">Changing your password signs you out on all devices.</div>
            </div>
            <Link to="/account/change-password" className="btn btn-sm btn-outline-primary">Change password</Link>
          </div>
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 pt-3">
            <div>
              <div className="fw-semibold">Forgot your current password?</div>
              <div className="small text-muted">We'll email a one-time reset link to {profile.email}.</div>
            </div>
            <Link to="/forgot-password" state={{ email: profile.email }} className="btn btn-sm btn-outline-secondary">
              Send reset link
            </Link>
          </div>
        </div>
      </section>

      <section className="ag-card" aria-labelledby="settings-account">
        <div className="ag-card-body">
          <h2 id="settings-account" className="h5 mb-3">Account</h2>
          <dl className="row">
            <dt className="col-sm-4 text-muted fw-normal">Member since</dt>
            <dd className="col-sm-8">{formatDate(profile.created_at)}</dd>
            <dt className="col-sm-4 text-muted fw-normal">Account type</dt>
            <dd className="col-sm-8">{isAdmin ? 'Administrator' : 'Standard user'}</dd>
            <dt className="col-sm-4 text-muted fw-normal">Status</dt>
            <dd className="col-sm-8"><span className="ag-badge ag-badge-success">Active</span></dd>
          </dl>
          <button type="button" className="btn btn-outline-danger" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </section>
    </div>
  )
}
