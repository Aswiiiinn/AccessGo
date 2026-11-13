import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import type { AccessibilityReport } from '@/types'
import StatusBadge from './StatusBadge'
import SeverityIndicator from './SeverityIndicator'
import { formatRelative, getCategory, reportTitle, truncate } from '@/features/reports/meta'

interface ReportCardProps {
  report: AccessibilityReport
  /** Show the first lines of the description. */
  showDescription?: boolean
  showLocation?: boolean
  selected?: boolean
  /** When provided, the card selects (e.g. highlights on the map) instead of navigating. */
  onSelect?: (id: number) => void
}

/** Compact, scannable report summary. The title is the link/button so it has a clear accessible name. */
export default function ReportCard({ report, showDescription = false, showLocation = false, selected = false, onSelect }: ReportCardProps) {
  const category = getCategory(report.category)
  const CategoryIcon = category.icon

  const title = reportTitle(report)
  const titleContent = <span className="ag-report-item-title d-block">{title}</span>

  return (
    <article className={`ag-card ag-report-item position-relative${selected ? ' ag-list-item-selected' : ''}`}>
      <div className="d-flex align-items-start justify-content-between gap-2">
        {onSelect ? (
          <button
            type="button"
            className="btn btn-link p-0 text-start text-decoration-none stretched-link ag-min-w-0"
            style={{ color: 'inherit', minHeight: 0 }}
            aria-pressed={selected}
            onClick={() => onSelect(report.id)}
          >
            {titleContent}
          </button>
        ) : (
          <Link to={`/reports/${report.id}`} className="text-decoration-none stretched-link ag-min-w-0" style={{ color: 'inherit' }}>
            {titleContent}
          </Link>
        )}
        <StatusBadge status={report.status} />
      </div>
      <div className="ag-report-meta">
        <span className="d-inline-flex align-items-center gap-1">
          <CategoryIcon size={14} aria-hidden="true" />
          {category.label}
        </span>
        <SeverityIndicator level={report.accessibility_impact} />
        <time dateTime={report.created_at}>{formatRelative(report.created_at)}</time>
      </div>
      {showLocation && report.location_detail?.name && (
        <div className="ag-report-meta">
          <span className="d-inline-flex align-items-center gap-1 ag-min-w-0">
            <MapPin size={14} aria-hidden="true" />
            <span className="text-truncate">{report.location_detail.name}</span>
          </span>
        </div>
      )}
      {showDescription && report.description && (
        <p className="small text-muted mb-0 ag-clamp-2">{truncate(report.description, 160)}</p>
      )}
    </article>
  )
}
