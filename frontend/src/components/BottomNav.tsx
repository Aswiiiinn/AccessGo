import { NavLink } from 'react-router-dom'
import { Compass, Route, Plus, ClipboardList, UserRound } from 'lucide-react'

const ITEMS = [
  { to: '/explore', label: 'Explore', icon: Compass, end: false },
  { to: '/', label: 'Plan Route', icon: Route, end: true },
  { to: '/reports/create', label: 'Report', icon: Plus, end: false, primary: true },
  { to: '/my-reports', label: 'My Reports', icon: ClipboardList, end: false },
  { to: '/account', label: 'Profile', icon: UserRound, end: false },
]

/** Primary navigation on phones and tablets (hidden from 992px via CSS). */
export default function BottomNav() {
  return (
    <nav className="ag-bottomnav" aria-label="Primary">
      <ul>
        {ITEMS.map(({ to, label, icon: Icon, end, primary }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => `${primary ? 'ag-bottomnav-report' : ''}${isActive ? ' active' : ''}`}
            >
              <span className="ag-bottomnav-icon" aria-hidden="true">
                <Icon size={primary ? 22 : 20} strokeWidth={primary ? 2.5 : 2} />
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
