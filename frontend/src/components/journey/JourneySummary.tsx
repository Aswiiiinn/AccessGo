import { BadgeCheck, Clock, Footprints, Hourglass } from 'lucide-react'
import type { AccessibilityReport } from '@/types'
import type { RouteResult } from '@/features/journey/routing'
import { formatDistance, formatDuration } from '@/features/journey/routing'
import { getSeverity, isActiveBarrier } from '@/features/reports/meta'
import ReportCard from '@/components/ReportCard'
import Notice from '@/components/ui/Notice'

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

interface JourneyStatsProps {
  route: RouteResult
  reports: AccessibilityReport[]
}

export function JourneyStats({ route, reports }: JourneyStatsProps) {
  const active = reports.filter(isActiveBarrier)
  const verified = active.filter((r) => r.status === 'verified').length
  const stats = [
    { label: 'Distance', value: formatDistance(route.distance), icon: Footprints },
    { label: 'Walking time', value: formatDuration(route.duration), icon: Clock },
    { label: 'Verified issues', value: verified, icon: BadgeCheck },
    { label: 'Unverified reports', value: active.length - verified, icon: Hourglass },
  ]
  return (
    <section aria-label="Journey summary">
      <dl className="ag-stats ag-stats-4 mb-0">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="ag-stat">
            <dt className="ag-stat-label">
              <Icon size={14} aria-hidden="true" />
              {label}
            </dt>
            <dd className="ag-stat-value mb-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

interface JourneyIssuesProps {
  reports: AccessibilityReport[]
  selectedReportId: number | null
  onSelectReport: (id: number) => void
}

/** Known barriers within the search corridor, most severe first. */
export function JourneyIssues({ reports, selectedReportId, onSelectReport }: JourneyIssuesProps) {
  const active = reports
    .filter(isActiveBarrier)
    .sort(
      (a, b) =>
        (SEVERITY_RANK[a.accessibility_impact] ?? 9) - (SEVERITY_RANK[b.accessibility_impact] ?? 9) ||
        (a.status === 'verified' ? -1 : 1) - (b.status === 'verified' ? -1 : 1)
    )
  const bySeverity = active.reduce<Record<string, number>>((acc, r) => {
    acc[r.accessibility_impact] = (acc[r.accessibility_impact] ?? 0) + 1
    return acc
  }, {})

  return (
    <section aria-labelledby="route-issues-heading">
      <div className="d-flex align-items-baseline justify-content-between gap-2 mb-2">
        <h2 id="route-issues-heading" className="h3 mb-0">
          {active.length === 0 ? 'No known barriers reported' : `${active.length} reported barrier${active.length === 1 ? '' : 's'} near this route`}
        </h2>
      </div>

      {active.length === 0 ? (
        <Notice tone="info" title="This doesn't mean the route is accessible">
          No one has reported a barrier within about 50&nbsp;m of this route yet. Conditions can change, and some barriers are
          never reported — please plan with care.
        </Notice>
      ) : (
        <>
          <p className="small text-muted mb-2">
            {(['critical', 'high', 'medium', 'low'] as const)
              .filter((lvl) => bySeverity[lvl])
              .map((lvl) => `${bySeverity[lvl]} ${getSeverity(lvl).label.toLowerCase()}`)
              .join(' · ')}
            {' '}— select a report to see it on the map.
          </p>
          <ul className="ag-list ag-list-plain">
            {active.map((r) => (
              <li key={r.id}>
                <ReportCard report={r} showLocation selected={r.id === selectedReportId} onSelect={onSelectReport} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export function RouteDisclaimer() {
  return (
    <Notice tone="warning" title="Based on known community reports" role="note">
      This is a standard walking route, not a guaranteed step-free or wheelchair-accessible one. Barriers only appear here if
      someone has reported them.
    </Notice>
  )
}
