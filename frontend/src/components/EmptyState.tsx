import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon?: LucideIcon
  /** Either navigate (`to`) or run a callback (`onClick`). */
  action?: { label: string; to?: string; onClick?: () => void; icon?: ReactNode }
  headingLevel?: 2 | 3
}

export default function EmptyState({ title, description, icon: Icon = Inbox, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className="ag-empty">
      <div className="ag-empty-icon" aria-hidden="true">
        <Icon size={26} />
      </div>
      <Heading>{title}</Heading>
      <p>{description}</p>
      {action &&
        (action.to ? (
          <Link to={action.to} className="btn btn-primary">
            {action.icon}
            {action.label}
          </Link>
        ) : (
          <button type="button" className="btn btn-primary" onClick={action.onClick}>
            {action.icon}
            {action.label}
          </button>
        ))}
    </div>
  )
}
