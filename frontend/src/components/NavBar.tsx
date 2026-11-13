import { Link, NavLink } from 'react-router-dom'
import { Compass, LayoutDashboard, Plus, Route, ClipboardList, Accessibility } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ProfileDropdown from '@/components/account/ProfileDropdown'
import UserAvatar from '@/components/account/UserAvatar'

export function BrandLink() {
  return (
    <Link to="/" className="ag-brand" aria-label="AccessGo home">
      <span className="ag-brand-mark" aria-hidden="true">
        <Accessibility size={18} />
      </span>
      AccessGo
    </Link>
  )
}

/**
 * Top bar. Desktop (≥992px): full navigation + profile dropdown.
 * Phones/tablets: brand + profile/login shortcut only; primary navigation lives in BottomNav.
 */
export default function Navbar() {
  const { isAuthenticated, isAdmin, user, isLoading } = useAuth()

  return (
    <header className="ag-topbar">
      <nav className="ag-topbar-inner" aria-label="Main">
        <BrandLink />
        <div className="ag-topnav">
          <NavLink to="/" end>
            <Route size={16} aria-hidden="true" />
            Plan Route
          </NavLink>
          <NavLink to="/explore">
            <Compass size={16} aria-hidden="true" />
            Explore
          </NavLink>
          {isAuthenticated && (
            <NavLink to="/my-reports">
              <ClipboardList size={16} aria-hidden="true" />
              My Reports
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin">
              <LayoutDashboard size={16} aria-hidden="true" />
              Admin
            </NavLink>
          )}
        </div>

        <div className="ag-topbar-actions">
          <Link to="/reports/create" className="btn btn-sm btn-report d-none d-lg-inline-flex">
            <Plus size={16} aria-hidden="true" />
            Report an issue
          </Link>
          {isLoading ? null : isAuthenticated && user ? (
            <>
              <div className="d-none d-lg-block">
                <ProfileDropdown />
              </div>
              {isAdmin && (
                <Link to="/admin" className="btn btn-sm btn-outline-light d-lg-none">
                  <LayoutDashboard size={16} aria-hidden="true" />
                  Admin
                </Link>
              )}
              <Link to="/account" className="d-lg-none d-inline-flex align-items-center justify-content-center" style={{ minWidth: 44, minHeight: 44 }} aria-label="Your account">
                <UserAvatar user={user} size={34} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm btn-outline-light">Log in</Link>
              <Link to="/register" className="btn btn-sm btn-light d-none d-sm-inline-flex">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
