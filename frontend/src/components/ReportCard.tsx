import type { AccessibilityReport } from '@/types'
import StatusBadge from './StatusBadge'

interface ReportCardProps {
  report: AccessibilityReport
  onClick?: () => void
}

export default function ReportCard({ report, onClick }: ReportCardProps) {
  return (
    <div className="card mb-3" style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <h6 className="card-title mb-1">{report.title}</h6>
          <StatusBadge status={report.status} />
        </div>
        <p className="card-text text-muted small mb-1">{report.description}</p>
        <small className="text-muted">
          {report.verification_count} verification{report.verification_count !== 1 ? 's' : ''} ·{' '}
          {new Date(report.created_at).toLocaleDateString()}
        </small>
      </div>
    </div>
  )
}
