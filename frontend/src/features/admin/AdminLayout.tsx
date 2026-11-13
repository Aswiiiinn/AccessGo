import { Suspense, useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { BarChart3, ClipboardList, Copy, LayoutDashboard, Menu, Users, ArrowLeft, Accessibility } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import ProfileDropdown from '@/components/account/ProfileDropdown'
import LoadingSpinner from '@/components/LoadingSpinner'
import Dialog from '@/components/ui/Dialog'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/reports', label: 'Reports', icon: ClipboardList, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/admin/duplicates', label: 'Duplicates', icon: Copy, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
]

function AdminNav() {
  return (
    <ul className="ag-admin-nav">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink to={to} end={end}>
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Separate shell for moderators: sidebar on desktop, drawer on phones. */
export default function AdminLayout() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [location.pathname])

  if (isLoading) return <LoadingSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!isAdmin) return <Navigate to="/" replace />

  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))

  return (
    <div className="ag-admin">
      <a href="#admin-main" className="ag-skip-link">Skip to main content</a>
      <aside className="ag-admin-sidebar" aria-label="Admin">
        <Link to="/admin" className="ag-brand">
          <span className="ag-brand-mark" aria-hidden="true"><Accessibility size={18} /></span>
          AccessGo <span className="fw-normal opacity-75 small">Admin</span>
        </Link>
        <nav aria-label="Admin sections"><AdminNav /></nav>
        <div className="mt-auto p-3">
          <Link to="/" className="btn btn-sm btn-outline-light w-100">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to AccessGo
          </Link>
        </div>
      </aside>

      <div className="ag-admin-content">
        <header className="ag-admin-topbar">
          <button type="button" className="btn btn-ghost btn-icon d-lg-none" onClick={() => setDrawerOpen(true)} aria-label="Open admin menu" aria-expanded={drawerOpen}>
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="fw-semibold">{current?.label ?? 'Admin'}</span>
          <div className="ms-auto admin-profile">
            <ProfileDropdown />
          </div>
        </header>
        <main id="admin-main" className="ag-page" tabIndex={-1} style={{ outline: 'none', maxWidth: 1280 }}>
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} title="AccessGo Admin" variant="full" className="ag-admin-drawer-dialog">
        <nav aria-label="Admin sections"><AdminNav /></nav>
        <Link to="/" className="btn btn-outline-light w-100 mt-3">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to AccessGo
        </Link>
      </Dialog>
    </div>
  )
}
