import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, Image as ImageIcon, ThumbsUp, ThumbsDown } from 'lucide-react'
import { adminReportsApi } from '@/features/reports/api'
import { parseApiError } from '@/lib/apiErrors'
import { useDebounce } from '@/hooks/useDebounce'
import { CATEGORIES, SEVERITIES, formatDate, getCategory } from '@/features/reports/meta'
import StatusBadge from '@/components/StatusBadge'
import SeverityIndicator from '@/components/SeverityIndicator'
import EmptyState from '@/components/EmptyState'
import ErrorMessage from '@/components/ErrorMessage'
import PageHeader from '@/components/ui/PageHeader'
import { ReportListSkeleton } from '@/components/ui/Skeleton'
import ModerationDialog from '../ModerationDialog'
import type { AdminReportList, PaginatedResponse } from '@/types'

const STATUS_FILTERS = [
  { value: 'pending', label: 'Needs review' },
  { value: 'verified', label: 'Verified' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
]
const PAGE_SIZE = 20

export default function AdminReportsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'pending'
  const severity = params.get('severity') ?? ''
  const category = params.get('category') ?? ''
  const page = Number(params.get('page') ?? '1') || 1
  const [search, setSearch] = useState(params.get('search') ?? '')
  const debouncedSearch = useDebounce(search, 400)
  const [data, setData] = useState<PaginatedResponse<AdminReportList> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const setParam = useCallback(
    (key: string, value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          if (key !== 'page') next.delete('page')
          if (key === 'status' && !value) next.set('status', '')
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) setParam('search', debouncedSearch)
  }, [debouncedSearch, params, setParam])

  const load = useCallback(async () => {
    setError(null)
    setData(null)
    const query: Record<string, string | number> = { page }
    if (status) query.status = status
    if (severity) query.severity = severity
    if (category) query.category = category
    if (params.get('search')) query.search = params.get('search')!
    try {
      setData(await adminReportsApi.getAll(query))
    } catch (err) {
      setError(parseApiError(err, 'Could not load reports.').message)
    }
  }, [page, status, severity, category, params])

  useEffect(() => {
    load()
  }, [load])

  const reports = data?.results ?? []
  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1
  const filtersActive = !!(severity || category || params.get('search'))

  return (
    <>
      <PageHeader title="Reports" description="Review, verify and resolve community reports." />

      <div className="ag-chips mb-3" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((f) => (
          <button key={f.label} type="button" className="ag-chip" aria-pressed={status === f.value} onClick={() => setParam('status', f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-5">
          <div className="ag-search">
            <Search size={18} className="ag-search-icon" aria-hidden="true" />
            <label htmlFor="admin-search" className="visually-hidden">Search reports</label>
            <input id="admin-search" type="search" className="form-control" placeholder="Search title or description" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="col-6 col-md-3">
          <label htmlFor="admin-severity" className="visually-hidden">Severity</label>
          <select id="admin-severity" className="form-select" value={severity} onChange={(e) => setParam('severity', e.target.value)}>
            <option value="">Any severity</option>
            {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="col-6 col-md-4">
          <label htmlFor="admin-category" className="visually-hidden">Category</label>
          <select id="admin-category" className="form-select" value={category} onChange={(e) => setParam('category', e.target.value)}>
            <option value="">Any category</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {!data && !error ? (
        <ReportListSkeleton count={5} />
      ) : data && reports.length === 0 ? (
        <div className="ag-card">
          <EmptyState
            title={status === 'pending' && !filtersActive ? 'All caught up' : 'No matching reports'}
            description={status === 'pending' && !filtersActive ? 'There are no reports waiting for review.' : 'Try changing the filters.'}
          />
        </div>
      ) : data ? (
        <>
          <p className="small text-muted" aria-live="polite">{data.count} report{data.count === 1 ? '' : 's'}</p>

          {/* Phones/tablets: cards */}
          <ul className="ag-list ag-list-plain d-lg-none">
            {reports.map((r) => (
              <li key={r.id}>
                <button type="button" className="ag-card ag-report-item w-100 text-start border" onClick={() => setOpenId(r.id)} style={{ color: 'inherit' }}>
                  <span className="d-flex justify-content-between gap-2 w-100">
                    <span className="ag-report-item-title">{r.title}</span>
                    <ChevronRight size={18} className="flex-shrink-0 text-muted" aria-hidden="true" />
                  </span>
                  <span className="ag-report-meta">
                    <StatusBadge status={r.status} />
                    <SeverityIndicator level={r.severity} />
                    <span>{getCategory(r.category).label}</span>
                  </span>
                  <span className="ag-report-meta">
                    <span>#{r.id} · {formatDate(r.creation_timestamp)}</span>
                    <span>{r.creator?.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="ag-card overflow-hidden d-none d-lg-block">
            <table className="table ag-table table-hover">
              <caption className="visually-hidden">Reports</caption>
              <thead>
                <tr>
                  <th scope="col">Report</th>
                  <th scope="col">Category</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Community</th>
                  <th scope="col">Submitted</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 320 }}>
                      <div className="fw-semibold text-truncate">{r.title}</div>
                      <div className="small text-muted text-truncate">#{r.id} · {r.creator?.email}</div>
                    </td>
                    <td>{getCategory(r.category).label}</td>
                    <td><SeverityIndicator level={r.severity} showSuffix={false} /></td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-nowrap small">
                      <span className="me-2" title="Confirmations"><ThumbsUp size={13} aria-hidden="true" /> {r.positive_verification_count}<span className="visually-hidden"> confirmations</span></span>
                      <span title="Disputes"><ThumbsDown size={13} aria-hidden="true" /> {r.negative_verification_count}<span className="visually-hidden"> disputes</span></span>
                      {r.image_count > 0 && <span className="ms-2" title="Photos"><ImageIcon size={13} aria-hidden="true" /> {r.image_count}<span className="visually-hidden"> photos</span></span>}
                    </td>
                    <td className="text-nowrap">{formatDate(r.creation_timestamp)}</td>
                    <td className="text-end">
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setOpenId(r.id)}>
                        Review<span className="visually-hidden"> report {r.id}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="d-flex align-items-center justify-content-center gap-2 mt-3" aria-label="Pagination">
              <button type="button" className="btn btn-outline-secondary" disabled={!data.previous} onClick={() => setParam('page', String(page - 1))}>
                <ChevronLeft size={18} aria-hidden="true" /> Previous
              </button>
              <span className="small text-muted px-2">Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-outline-secondary" disabled={!data.next} onClick={() => setParam('page', String(page + 1))}>
                Next <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      ) : null}

      <ModerationDialog reportId={openId} onClose={() => setOpenId(null)} onChanged={load} />
    </>
  )
}
