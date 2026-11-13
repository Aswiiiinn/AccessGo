import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, MapPin } from 'lucide-react'
import { verificationApi } from '@/features/verification/api'
import { reportsApi } from '@/features/reports/api'
import { getCategory } from '@/features/reports/meta'
import StatusBadge from '@/components/StatusBadge'
import SeverityIndicator from '@/components/SeverityIndicator'
import type { AccessibilityReport } from '@/types'

const MAX_SHOWN = 3

interface DuplicateWarningProps {
  reportId: number
  /** Offered as a secondary action when the user decides it's the same issue. */
  onWithdraw?: () => void
}

/**
 * Non-blocking notice listing possible duplicates found by the backend
 * (GET /reports/{id}/potential-duplicates/, author or admin only).
 */
export default function DuplicateWarning({ reportId, onWithdraw }: DuplicateWarningProps) {
  const [matches, setMatches] = useState<AccessibilityReport[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    verificationApi
      .getPotentialDuplicates(reportId)
      .then(async (dups) => {
        const ids = Array.from(
          new Set(
            dups
              .filter((d) => d.status !== 'dismissed')
              .map((d) => (d.source_report === reportId ? d.matched_report : d.source_report))
          )
        ).slice(0, MAX_SHOWN)
        const reports = await Promise.all(ids.map((id) => reportsApi.getById(id).catch(() => null)))
        if (!cancelled) setMatches(reports.filter((r): r is AccessibilityReport => r !== null))
      })
      .catch(() => {
        /* Duplicate detection is advisory; ignore failures. */
      })
    return () => {
      cancelled = true
    }
  }, [reportId])

  if (dismissed || matches.length === 0) return null

  return (
    <section className="ag-notice ag-notice-warning flex-column" aria-labelledby={`dup-${reportId}`}>
      <div className="d-flex gap-2 align-items-start">
        <Copy size={18} className="flex-shrink-0 mt-1" aria-hidden="true" />
        <div>
          <h2 id={`dup-${reportId}`} className="ag-notice-title h6 mb-1">
            {matches.length === 1 ? 'Similar report found nearby' : `${matches.length} similar reports found nearby`}
          </h2>
          <p className="mb-0">If one of these is the same problem, confirming it there helps more than a second report. If it's a new incident, keep yours.</p>
        </div>
      </div>
      <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
        {matches.map((m) => {
          const cat = getCategory(m.category)
          return (
            <li key={m.id} className="ag-card ag-card-body" style={{ color: 'var(--ag-text)' }}>
              <div className="fw-semibold ag-break mb-1">{m.title}</div>
              <div className="ag-report-meta mb-2">
                {m.location_detail?.name && (
                  <span className="d-inline-flex align-items-center gap-1">
                    <MapPin size={13} aria-hidden="true" />
                    {m.location_detail.name}
                  </span>
                )}
                <span>{cat.label}</span>
                <SeverityIndicator level={m.accessibility_impact} />
                <StatusBadge status={m.status} />
              </div>
              <Link to={`/reports/${m.id}`} className="btn btn-sm btn-outline-primary">
                View existing report<span className="visually-hidden">: {m.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="d-flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setDismissed(true)}>
          It's a new issue — keep my report
        </button>
        {onWithdraw && (
          <button type="button" className="btn btn-sm btn-ghost text-danger" onClick={onWithdraw}>
            Same issue — withdraw mine
          </button>
        )}
      </div>
    </section>
  )
}
