import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { AccessibilityReport } from '@/types'
import StatusBadge from '@/components/StatusBadge'
import SeverityIndicator from '@/components/SeverityIndicator'
import { formatDate, getCategory, getStatus, reportTitle, truncate } from '@/features/reports/meta'

/** Compact report summary shown when a map marker is chosen (bottom sheet on phones, panel on desktop). */
export default function ReportPreview({ report, headingLevel = 3 }: { report: AccessibilityReport; headingLevel?: 2 | 3 | null }) {
  const category = getCategory(report.category)
  const CategoryIcon = category.icon
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div>
      {headingLevel !== null && <Heading className="h3 mb-2 ag-break">{reportTitle(report)}</Heading>}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
        <StatusBadge status={report.status} />
        <SeverityIndicator level={report.accessibility_impact} />
        <span className="ag-badge ag-badge-neutral">
          <CategoryIcon size={13} aria-hidden="true" />
          {category.label}
        </span>
      </div>
      <p className="small text-muted mb-2">{getStatus(report.status).description}</p>
      {report.description && <p className="mb-2">{truncate(report.description, 180)}</p>}
      <div className="ag-report-meta mb-3">
        {report.location_detail?.name && (
          <span className="d-inline-flex align-items-center gap-1 ag-min-w-0">
            <MapPin size={14} aria-hidden="true" />
            <span className="text-truncate">{report.location_detail.name}</span>
          </span>
        )}
        <span>Reported {formatDate(report.created_at)}</span>
        <span className="d-inline-flex align-items-center gap-1">
          <ThumbsUp size={13} aria-hidden="true" /> {report.confirm_count ?? 0}
          <span className="visually-hidden">confirmations,</span>
          <ThumbsDown size={13} className="ms-1" aria-hidden="true" /> {report.dispute_count ?? 0}
          <span className="visually-hidden">disputes</span>
        </span>
      </div>
      <Link to={`/reports/${report.id}`} className="btn btn-primary w-100">
        View details
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}
