import type { ReactNode } from 'react'
import { Accessibility } from 'lucide-react'

interface AuthCardProps {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Shared layout for login, registration and password recovery screens. */
export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="ag-page" style={{ maxWidth: 460 }}>
      <div className="text-center mb-3 mt-lg-4">
        <span className="ag-brand-mark mx-auto mb-3" style={{ width: 48, height: 48, borderRadius: 14 }} aria-hidden="true">
          <Accessibility size={26} color="#fff" />
        </span>
        <h1 className="mb-1">{title}</h1>
        {subtitle && <p className="text-muted mb-0">{subtitle}</p>}
      </div>
      <div className="ag-card ag-card-body">{children}</div>
      {footer && <div className="text-center mt-3 small">{footer}</div>}
    </div>
  )
}
