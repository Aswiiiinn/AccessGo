import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, ClipboardList, KeyRound, LayoutDashboard, LogIn, LogOut, Settings, UserPlus, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import UserAvatar, { getDisplayName } from '@/components/account/UserAvatar'
import LoadingSpinner from '@/components/LoadingSpinner'
import EmptyState from '@/components/EmptyState'

const LINKS = [
  { to: '/profile', label: 'My Profile', icon: UserRound },
  { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
  { to: '/account/settings', label: 'Account Settings', icon: Settings },
  { to: '/account/change-password', label: 'Change Password', icon: KeyRound },
]

/** The "Profile" tab on phones: a single place for every account action. */
export default function AccountHubPage() {
  const { user, isAdmin, isLoading, logoutUser } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  if (isLoading) return <LoadingSpinner />

  if (!user) {
    return (
      <div className="ag-page ag-page-narrow">
        <h1 className="visually-hidden">Your account</h1>
        <div className="ag-card">
          <EmptyState
            icon={UserRound}
            title="Join the AccessGo community"
            description="Log in to report barriers, verify reports from others and track the issues you've submitted."
            action={{ label: 'Log in', to: '/login', icon: <LogIn size={18} aria-hidden="true" /> }}
          />
          <div className="text-center pb-4" style={{ marginTop: -16 }}>
            <Link to="/register" className="btn btn-outline-primary">
              <UserPlus size={18} aria-hidden="true" />
              Create an account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutUser()
    } finally {
      navigate('/login', { replace: true, state: { message: 'You have been logged out.' } })
    }
  }

  return (
    <div className="ag-page ag-page-narrow">
      <h1 className="visually-hidden">Your account</h1>
      <section className="ag-card ag-card-body d-flex align-items-center gap-3 mb-3">
        <UserAvatar user={user} size={60} />
        <div className="ag-min-w-0">
          <div className="fw-semibold fs-5 text-truncate">{getDisplayName(user)}</div>
          <div className="small text-muted text-truncate">{user.email}</div>
          {isAdmin && <span className="ag-badge ag-badge-info mt-1">Administrator</span>}
        </div>
      </section>

      <nav className="ag-card mb-3" aria-label="Account">
        <ul className="ag-menu-list">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to}>
                <Icon size={20} className="ag-menu-icon" aria-hidden="true" />
                {label}
                <ChevronRight size={18} className="ag-menu-chevron" aria-hidden="true" />
              </Link>
            </li>
          ))}
          {isAdmin && (
            <li>
              <Link to="/admin">
                <LayoutDashboard size={20} className="ag-menu-icon" aria-hidden="true" />
                Admin dashboard
                <ChevronRight size={18} className="ag-menu-chevron" aria-hidden="true" />
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="ag-card">
        <ul className="ag-menu-list">
          <li>
            <button type="button" className="text-danger" onClick={handleLogout} disabled={loggingOut}>
              <LogOut size={20} aria-hidden="true" />
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}
