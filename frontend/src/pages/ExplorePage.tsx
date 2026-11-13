import { useCallback, useEffect, useState } from 'react'
import { List, LocateFixed, Map as MapIcon, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { reportsApi } from '@/features/reports/api'
import { parseApiError } from '@/lib/apiErrors'
import { useDebounce } from '@/hooks/useDebounce'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { reportTitle } from '@/features/reports/meta'
import { useCurrentPosition, type Coords } from '@/hooks/useCurrentPosition'
import JourneyMap, { MapLegend } from '@/components/journey/JourneyMap'
import ReportPreview from '@/components/journey/ReportPreview'
import ReportCard from '@/components/ReportCard'
import EmptyState from '@/components/EmptyState'
import ErrorMessage from '@/components/ErrorMessage'
import Dialog from '@/components/ui/Dialog'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'
import PageHeader from '@/components/ui/PageHeader'
import { ReportListSkeleton } from '@/components/ui/Skeleton'
import type { AccessibilityReport } from '@/types'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Unverified' },
  { value: 'resolved', label: 'Resolved' },
]

export default function ExplorePage() {
  const isDesktop = useIsDesktop()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [reports, setReports] = useState<AccessibilityReport[] | null>(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [userLocation, setUserLocation] = useState<Coords | null>(null)
  const { locate, locating, error: locationError } = useCurrentPosition()

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      setError(null)
      if (append) setLoadingMore(true)
      else setReports(null)
      try {
        const data = await reportsApi.getAll({ status, search: debouncedSearch, page: nextPage, ordering: '-created_at', category: '', severity: '' })
        setReports((prev) => (append && prev ? [...prev, ...data.results] : data.results))
        setCount(data.count)
        setHasMore(!!data.next)
        setPage(nextPage)
      } catch (err) {
        setError(parseApiError(err, 'Could not load reports.').message)
        if (!append) setReports([])
      } finally {
        setLoadingMore(false)
      }
    },
    [status, debouncedSearch]
  )

  useEffect(() => {
    load(1, false)
  }, [load])

  const nearMe = async () => {
    const coords = await locate()
    if (coords) {
      setUserLocation(coords)
      if (!isDesktop) setView('map')
    }
  }

  const selected = reports?.find((r) => r.id === selectedId) ?? null
  const mapReports = reports ?? []

  const map = (
    <div>
      <JourneyMap
        route={[]}
        reports={mapReports}
        userLocation={userLocation}
        selectedReportId={selectedId}
        onSelectReport={setSelectedId}
        className="ag-map ag-map-tall"
        label="Map of reported accessibility barriers"
        focusPoint={userLocation}
      />
      <MapLegend />
    </div>
  )

  const list = (
    <>
      {error && <ErrorMessage message={error} onRetry={() => load(1, false)} />}
      {reports === null ? (
        <ReportListSkeleton count={4} />
      ) : reports.length === 0 ? (
        <div className="ag-card">
          <EmptyState
            icon={Search}
            title={search || status ? 'No matching reports' : 'No reports yet'}
            description={search || status ? 'Try a different search or filter.' : 'Be the first to report an accessibility barrier in your area.'}
            action={search || status ? { label: 'Clear filters', onClick: () => { setSearch(''); setStatus('') } } : { label: 'Report an issue', to: '/reports/create' }}
          />
        </div>
      ) : (
        <>
          <ul className="ag-list ag-list-plain">
            {reports.map((r) => (
              <li key={r.id}>
                <ReportCard report={r} showLocation showDescription selected={r.id === selectedId} onSelect={isDesktop ? setSelectedId : undefined} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="text-center mt-3">
              <LoadingButton className="btn btn-outline-primary" loading={loadingMore} loadingText="Loading…" onClick={() => load(page + 1, true)}>
                Show more reports
              </LoadingButton>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <div className="ag-page">
      <PageHeader
        title="Explore reports"
        description="Accessibility barriers reported by the community."
        actions={
          <Link to="/reports/create" className="btn btn-accent d-none d-lg-inline-flex">
            <Plus size={18} aria-hidden="true" />
            Report an issue
          </Link>
        }
      />

      <div className="d-flex flex-column gap-3 mb-3">
        <div className="d-flex gap-2">
          <div className="ag-search flex-grow-1">
            <Search size={18} className="ag-search-icon" aria-hidden="true" />
            <label htmlFor="explore-search" className="visually-hidden">Search reports</label>
            <input
              id="explore-search"
              type="search"
              className="form-control"
              placeholder="Search reports"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              enterKeyHint="search"
            />
          </div>
          <LoadingButton className="btn btn-outline-secondary flex-shrink-0" loading={locating} onClick={nearMe} icon={<LocateFixed size={18} aria-hidden="true" />}>
            <span className="d-none d-sm-inline">Near me</span>
            <span className="visually-hidden d-sm-none">Show my location</span>
          </LoadingButton>
        </div>
        {locationError && <Notice tone="warning">{locationError}</Notice>}
        <div className="ag-chips" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} type="button" className="ag-chip" aria-pressed={status === f.value} onClick={() => setStatus(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="d-flex align-items-center justify-content-between gap-2">
          <p className="small text-muted mb-0" aria-live="polite">
            {reports === null ? 'Loading reports…' : `${count} report${count === 1 ? '' : 's'}${reports.length < count ? `, showing ${reports.length}` : ''}`}
          </p>
          {!isDesktop && (
            <div className="btn-group" role="group" aria-label="View">
              <button type="button" className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={view === 'list'} onClick={() => setView('list')}>
                <List size={16} aria-hidden="true" /> List
              </button>
              <button type="button" className={`btn btn-sm ${view === 'map' ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={view === 'map'} onClick={() => setView('map')}>
                <MapIcon size={16} aria-hidden="true" /> Map
              </button>
            </div>
          )}
        </div>
      </div>

      {isDesktop ? (
        <div className="row g-4">
          <div className="col-lg-5">{list}</div>
          <div className="col-lg-7">
            <div className="position-sticky d-flex flex-column gap-3" style={{ top: 'calc(var(--ag-topbar-h) + 16px)' }}>
              {map}
              {selected && (
                <section className="ag-card ag-card-body" aria-label="Selected report">
                  <ReportPreview report={selected} />
                </section>
              )}
            </div>
          </div>
        </div>
      ) : view === 'map' ? (
        map
      ) : (
        list
      )}

      {!isDesktop && (
        <Dialog open={!!selected} onClose={() => setSelectedId(null)} title={selected ? reportTitle(selected) : ''}>
          {selected && <ReportPreview report={selected} headingLevel={null} />}
        </Dialog>
      )}
    </div>
  )
}
