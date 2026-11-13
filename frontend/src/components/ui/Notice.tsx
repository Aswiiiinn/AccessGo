import type { ReactNode } from 'react'
import { Info, TriangleAlert, CircleAlert, CircleCheck } from 'lucide-react'

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'neutral'
const ICONS = { info: Info, warning: TriangleAlert, danger: CircleAlert, success: CircleCheck, neutral: Info }

interface NoticeProps {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
  /** Use "alert" for errors that should interrupt screen readers. */
  role?: 'status' | 'alert' | 'note'
}

/** Inline, non-blocking message with an icon and optional action. */
export default function Notice({ tone = 'info', title, children, action, className = '', role }: NoticeProps) {
  const Icon = ICONS[tone]
  return (
    <div className={`ag-notice ag-notice-${tone} ${className}`} role={role ?? (tone === 'danger' ? 'alert' : undefined)}>
      <Icon size={18} aria-hidden="true" />
      <div className="flex-grow-1 ag-min-w-0">
        {title && <div className="ag-notice-title">{title}</div>}
        {children}
        {action && <div className="mt-2 d-flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}
