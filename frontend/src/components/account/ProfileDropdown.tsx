import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ClipboardList, KeyRound, LogOut, Settings, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import UserAvatar, { getDisplayName } from './UserAvatar'

const MENU_ITEMS = [
  { to: '/profile', label: 'My Profile', icon: UserRound },
  { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
  { to: '/account/settings', label: 'Account Settings', icon: Settings },
  { to: '/account/change-password', label: 'Change Password', icon: KeyRound },
]

/** Desktop profile menu. On phones the bottom-nav "Profile" tab opens /account instead. */
export default function ProfileDropdown() {
  const { user, logoutUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const menuId = useId()

  // Close on outside click / Escape, and whenever the route changes.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => setOpen(false), [location.pathname])

  if (!user) return null
  const name = getDisplayName(user)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutUser()
    } finally {
      setLoggingOut(false)
      setOpen(false)
      navigate('/login', { replace: true, state: { message: 'You have been logged out.' } })
    }
  }

  return (
    <div className="profile-menu" ref={containerRef}>
      <button
        ref={toggleRef}
        type="button"
        className="ag-profile-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <UserAvatar user={user} size={32} />
        <span className="text-truncate d-none d-xl-inline" style={{ maxWidth: '10rem' }}>{name}</span>
        <span className="visually-hidden d-xl-none">Account menu for {name}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <ul id={menuId} className={`dropdown-menu${open ? ' show' : ''}`} style={{ position: 'absolute' }}>
        <li className="px-3 py-2">
          <div className="fw-semibold text-truncate">{name}</div>
          <div className="small text-muted text-truncate">{user.email}</div>
        </li>
        <li><hr className="dropdown-divider" /></li>
        {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link className="dropdown-item" to={to}>
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button type="button" className="dropdown-item text-danger" onClick={handleLogout} disabled={loggingOut}>
            <LogOut size={16} aria-hidden="true" />
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </li>
      </ul>
    </div>
  )
}
