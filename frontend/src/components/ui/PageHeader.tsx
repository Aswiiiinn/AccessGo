import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Back link or breadcrumb rendered above the title. */
  before?: ReactNode
}

export default function PageHeader({ title, description, actions, before }: PageHeaderProps) {
  return (
    <header className="ag-page-header">
      {before}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div className="ag-min-w-0">
          <h1 className="mb-0 ag-break">{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}
