import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/profile', label: 'My Profile' },
  { to: '/account/settings', label: 'Account Settings' },
  { to: '/account/change-password', label: 'Change Password' },
]

/** Common heading + section tabs for the signed-in account pages. */
export default function AccountPageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="ag-page ag-page-medium">
      <header className="ag-page-header">
        <h1 className="mb-0">{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <nav aria-label="Account sections" className="ag-tabs">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to}>{l.label}</NavLink>
        ))}
      </nav>
      {children}
    </div>
  )
}
