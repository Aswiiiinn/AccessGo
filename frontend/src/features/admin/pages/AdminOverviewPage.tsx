import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Ban, ClipboardList, Hourglass, MapPin, ThumbsDown, ThumbsUp, TriangleAlert, Users, Wrench } from 'lucide-react'
import { dashboardApi } from '@/features/dashboard/api'
import { parseApiError } from '@/lib/apiErrors'
import ErrorMessage from '@/components/ErrorMessage'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DashboardStatistics } from '@/types'

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setStats(await dashboardApi.getStatistics())
    } catch (err) {
      setError(parseApiError(err, 'Could not load statistics.').message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const tiles = stats
    ? [
        { label: 'Awaiting review', value: stats.pending_reports, icon: Hourglass, to: '/admin/reports?status=pending', emphasis: true },
        { label: 'High / critical', value: stats.high_severity_reports, icon: TriangleAlert, to: '/admin/reports?severity=high' },
        { label: 'Verified', value: stats.verified_reports, icon: BadgeCheck },
        { label: 'Resolved', value: stats.resolved_reports, icon: Wrench },
        { label: 'Rejected', value: stats.rejected_reports, icon: Ban },
        { label: 'Total reports', value: stats.total_reports, icon: ClipboardList },
        { label: 'Registered users', value: stats.total_registered_users, icon: Users, to: '/admin/users' },
        { label: 'Locations', value: stats.total_accessibility_locations, icon: MapPin },
        { label: 'Community confirms', value: stats.total_positive_verifications, icon: ThumbsUp },
        { label: 'Community disputes', value: stats.total_negative_verifications, icon: ThumbsDown },
      ]
    : []

  return (
    <>
      <PageHeader title="Overview" description="What needs attention across AccessGo." />
      {error && <ErrorMessage message={error} onRetry={load} />}

      {stats && stats.pending_reports > 0 && (
        <div className="ag-card ag-card-body d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3" style={{ borderLeft: '4px solid var(--ag-warning-fill)' }}>
          <div>
            <div className="fw-semibold">{stats.pending_reports} report{stats.pending_reports === 1 ? '' : 's'} waiting for moderation</div>
            <div className="small text-muted">Unverified reports are shown to the public with a clear “Unverified” label until reviewed.</div>
          </div>
          <Link to="/admin/reports?status=pending" className="btn btn-primary">
            Review now
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      <dl className="ag-stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {!stats && !error
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="ag-stat" aria-hidden="true">
                <Skeleton width="60%" height={12} />
                <Skeleton width="40%" height={24} style={{ marginTop: 8 }} />
              </div>
            ))
          : tiles.map(({ label, value, icon: Icon, to }) => (
              <div key={label} className="ag-stat position-relative">
                <dt className="ag-stat-label">
                  <Icon size={14} aria-hidden="true" />
                  {to ? (
                    <Link to={to} className="stretched-link text-reset text-decoration-none">{label}</Link>
                  ) : (
                    label
                  )}
                </dt>
                <dd className="ag-stat-value mb-0">{value.toLocaleString()}</dd>
              </div>
            ))}
      </dl>

      <div className="mt-3">
        <Link to="/admin/analytics" className="btn btn-outline-primary">
          View analytics
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </>
  )
}
