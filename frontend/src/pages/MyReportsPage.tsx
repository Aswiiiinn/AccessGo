import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { reportsApi } from '@/features/reports/api'
import { parseApiError } from '@/lib/apiErrors'
import { formatDate, getCategory } from '@/features/reports/meta'
import ReportCard from '@/components/ReportCard'
import StatusBadge from '@/components/StatusBadge'
import SeverityIndicator from '@/components/SeverityIndicator'
import EmptyState from '@/components/EmptyState'
import ErrorMessage from '@/components/ErrorMessage'
import PageHeader from '@/components/ui/PageHeader'
import { ReportListSkeleton } from '@/components/ui/Skeleton'
import type { AccessibilityReport, PaginatedResponse } from '@/types'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Unverified' },
  { value: 'verified', label: 'Verified' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
]
const PAGE_SIZE = 20 // REST_FRAMEWORK.PAGE_SIZE

export default function MyReportsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PaginatedResponse<AccessibilityReport> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setData(null)
    setError(null)
    try {
      setData(await reportsApi.getAll({ mine: true, status, page, ordering: '-created_at', category: '', severity: '', search: '' }))
    } catch (err) {
      setError(parseApiError(err, 'Could not load your reports.').message)
    }
  }, [status, page])

  useEffect(() => {
    load()
  }, [load])

  const changeStatus = (value: string) => {
    setStatus(value)
    setPage(1)
  }

  const reports = data?.results ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  return (
    <div className="ag-page">
      <PageHeader
        title="My reports"
        description="Track the barriers you've reported and their review status."
        actions={
          <Link to="/reports/create" className="btn btn-accent">
            <Plus size={18} aria-hidden="true" />
            New report
          </Link>
        }
      />

      <div className="ag-chips mb-3" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button key={f.value} type="button" className="ag-chip" aria-pressed={status === f.value} onClick={() => changeStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {!data && !error ? (
        <ReportListSkeleton count={4} label="Loading your reports" />
      ) : data && reports.length === 0 ? (
        <div className="ag-card">
          {status ? (
            <EmptyState icon={ClipboardList} title="No reports with this status" description="Try another filter to see your other reports." action={{ label: 'Show all reports', onClick: () => changeStatus('') }} />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="You haven't submitted any reports yet"
              description="Spotted a broken lift, a blocked ramp or a missing dropped kerb? Reporting it takes about a minute and helps everyone plan safer journeys."
              action={{ label: 'Report your first issue', to: '/reports/create', icon: <Plus size={18} aria-hidden="true" /> }}
            />
          )}
        </div>
      ) : data ? (
        <>
          <p className="small text-muted" aria-live="polite">
            {data.count} report{data.count === 1 ? '' : 's'}
          </p>

          {/* Phones/tablets: cards */}
          <ul className="ag-list ag-list-plain d-lg-none">
            {reports.map((r) => (
              <li key={r.id}>
                <ReportCard report={r} showLocation />
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="ag-card overflow-hidden d-none d-lg-block">
            <table className="table ag-table table-hover">
              <caption className="visually-hidden">Your reports</caption>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Category</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/${r.id}`)}>
                    <td style={{ maxWidth: 360 }}>
                      <Link to={`/reports/${r.id}`} className="fw-semibold text-decoration-none" style={{ color: 'var(--ag-text)' }} onClick={(e) => e.stopPropagation()}>
                        {r.title}
                      </Link>
                      {r.location_detail?.name && <div className="small text-muted text-truncate">{r.location_detail.name}</div>}
                    </td>
                    <td>{getCategory(r.category).label}</td>
                    <td><SeverityIndicator level={r.accessibility_impact} showSuffix={false} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-nowrap">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="d-flex align-items-center justify-content-center gap-2 mt-3" aria-label="Pagination">
              <button type="button" className="btn btn-outline-secondary" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={18} aria-hidden="true" />
                Previous
              </button>
              <span className="small text-muted px-2">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="btn btn-outline-secondary" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>
                Next
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      ) : null}
    </div>
  )
}
