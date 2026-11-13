import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, Compass, Navigation, Plus, Search, ShieldCheck, Route as RouteIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { reportsApi } from '@/features/reports/api'
import { getReportsNearRoute } from '@/features/journey/api'
import { calculateRoute, type RouteResult } from '@/features/journey/routing'
import type { LocationPoint } from '@/features/journey/geocoding'
import { useCurrentPosition, type Coords } from '@/hooks/useCurrentPosition'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import { reportTitle } from '@/features/reports/meta'
import { parseApiError } from '@/lib/apiErrors'
import { getDisplayName } from '@/components/account/UserAvatar'
import LocationSearchInput from '@/components/journey/LocationSearchInput'
import JourneyMap, { MapLegend } from '@/components/journey/JourneyMap'
import { JourneyIssues, JourneyStats, RouteDisclaimer } from '@/components/journey/JourneySummary'
import ReportPreview from '@/components/journey/ReportPreview'
import ReportCard from '@/components/ReportCard'
import Dialog from '@/components/ui/Dialog'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'
import { ReportListSkeleton } from '@/components/ui/Skeleton'
import type { AccessibilityReport } from '@/types'

const HOW_IT_WORKS = [
  { icon: Search, title: 'Enter your journey', text: 'Choose where you are starting and where you want to go.' },
  { icon: RouteIcon, title: 'We find a walking route', text: 'A standard walking route is calculated with OpenStreetMap.' },
  { icon: ShieldCheck, title: 'See known barriers', text: 'Community reports within about 50 m of the route are shown, verified ones marked clearly.' },
]

export default function HomePage() {
  const { user } = useAuth()
  const isDesktop = useIsDesktop()
  const { locate, locating, error: locationError } = useCurrentPosition()

  const [origin, setOrigin] = useState<LocationPoint | null>(null)
  const [destination, setDestination] = useState<LocationPoint | null>(null)
  const [userLocation, setUserLocation] = useState<Coords | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeReports, setRouteReports] = useState<AccessibilityReport[]>([])
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [recent, setRecent] = useState<AccessibilityReport[] | null>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    reportsApi
      .getAll({ page: 1, ordering: '-created_at', status: '', category: '', severity: '', search: '' })
      .then((r) => setRecent(r.results ?? []))
      .catch(() => setRecent([]))
  }, [])

  const useMyLocation = async () => {
    const coords = await locate()
    if (coords) {
      setUserLocation(coords)
      setOrigin({ name: 'My current location', ...coords })
    }
  }

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  const findRoute = async (e: FormEvent) => {
    e.preventDefault()
    if (!origin || !destination) {
      setFormError(!origin ? 'Choose a starting point from the suggestions.' : 'Choose a destination from the suggestions.')
      return
    }
    setFormError(null)
    setRouteError(null)
    setReportsError(null)
    setSelectedId(null)
    setRouteLoading(true)
    try {
      const result = await calculateRoute(origin, destination)
      try {
        const near = await getReportsNearRoute(result.geometry, 50)
        setRouteReports(near.results)
      } catch (err) {
        setRouteReports([])
        setReportsError(parseApiError(err, 'We found a route but could not load reports near it.').message)
      }
      setRoute(result)
      requestAnimationFrame(() => resultsRef.current?.focus())
    } catch (err) {
      setRoute(null)
      setRouteError(err instanceof Error && err.message ? `${err.message}. Try nearby places or check your connection.` : 'Could not calculate a route.')
    } finally {
      setRouteLoading(false)
    }
  }

  const selected = routeReports.find((r) => r.id === selectedId) ?? null

  return (
    <div className="ag-page">
      <div className="row g-4">
        {/* Left column: planner + results */}
        <div className="col-lg-5 col-xl-4">
          <div className="ag-hero">
            <p className="ag-eyebrow mb-1">{user ? `Hi ${getDisplayName(user).split(' ')[0]}` : 'Welcome to AccessGo'}</p>
            <h1>Plan an accessible journey</h1>
            <p>See barriers people have reported along your walking route before you set off.</p>
          </div>

          <form className="ag-card ag-card-body" onSubmit={findRoute} noValidate aria-label="Plan a journey">
            <div className="ag-route-fields">
              <div className="ag-route-field">
                <span className="ag-route-dot ag-route-dot-start" aria-hidden="true"><span /></span>
                <div className="flex-grow-1">
                  <LocationSearchInput
                    label="From"
                    placeholder="Starting point"
                    value={origin}
                    onChange={setOrigin}
                    onUseCurrentLocation={useMyLocation}
                    locating={locating}
                    error={locationError}
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end" style={{ margin: '-6px 0 -10px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={swap} disabled={!origin && !destination}>
                  <ArrowUpDown size={16} aria-hidden="true" />
                  Swap
                </button>
              </div>
              <div className="ag-route-field">
                <span className="ag-route-dot" aria-hidden="true"><Navigation size={18} color="var(--ag-navy)" /></span>
                <div className="flex-grow-1">
                  <LocationSearchInput label="To" placeholder="Destination" value={destination} onChange={setDestination} />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="journey-preference" className="form-label">Journey preference</label>
              <select id="journey-preference" className="form-select" defaultValue="standard" aria-describedby="journey-preference-help">
                <option value="standard">Standard walking route</option>
              </select>
              <div id="journey-preference-help" className="form-text">More route types will be added as data improves.</div>
            </div>

            {formError && <Notice tone="danger" className="mt-3">{formError}</Notice>}
            {routeError && <Notice tone="danger" className="mt-3">{routeError}</Notice>}

            <LoadingButton type="submit" className="btn btn-primary btn-lg w-100 mt-3" loading={routeLoading} loadingText="Finding route…" icon={<RouteIcon size={18} aria-hidden="true" />}>
              Find route
            </LoadingButton>
          </form>

          {route && (
            <div className="mt-4 d-flex flex-column gap-3">
              <h2 ref={resultsRef} tabIndex={-1} className="h2 mb-0" style={{ outline: 'none' }}>Your route</h2>
              <JourneyStats route={route} reports={routeReports} />
              <RouteDisclaimer />
              {reportsError && <Notice tone="danger">{reportsError}</Notice>}
              {/* On phones the map sits between the summary and the issue list. */}
              {!isDesktop && (
                <div>
                  <JourneyMap route={route.geometry} origin={origin} destination={destination} userLocation={userLocation} reports={routeReports} selectedReportId={selectedId} onSelectReport={setSelectedId} />
                  <MapLegend />
                </div>
              )}
              <JourneyIssues reports={routeReports} selectedReportId={selectedId} onSelectReport={setSelectedId} />
            </div>
          )}

          {!route && !isDesktop && <HowItWorks />}
          {!route && !isDesktop && <RecentReports reports={recent} />}
        </div>

        {/* Right column (desktop only) */}
        {isDesktop && (
          <div className="col-lg-7 col-xl-8">
            <div className="position-sticky d-flex flex-column gap-3" style={{ top: 'calc(var(--ag-topbar-h) + 16px)' }}>
              {route ? (
                <>
                  <div>
                    <JourneyMap route={route.geometry} origin={origin} destination={destination} userLocation={userLocation} reports={routeReports} selectedReportId={selectedId} onSelectReport={setSelectedId} />
                    <MapLegend />
                  </div>
                  {selected ? (
                    <section className="ag-card ag-card-body" aria-label="Selected report">
                      <ReportPreview report={selected} />
                    </section>
                  ) : (
                    <p className="small text-muted mb-0">Select a marker or a report in the list to see its details here.</p>
                  )}
                </>
              ) : (
                <>
                  <HowItWorks />
                  <RecentReports reports={recent} />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phones: marker details in a bottom sheet */}
      {!isDesktop && (
        <Dialog open={!!selected} onClose={() => setSelectedId(null)} title={selected ? reportTitle(selected) : ''}>
          {selected && <ReportPreview report={selected} headingLevel={null} />}
        </Dialog>
      )}
    </div>
  )
}

function HowItWorks() {
  return (
    <section className="ag-card ag-card-body mt-4 mt-lg-0" aria-labelledby="how-heading">
      <h2 id="how-heading" className="h3 mb-3">How it works</h2>
      <ol className="list-unstyled d-flex flex-column gap-3 mb-0">
        {HOW_IT_WORKS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="d-flex gap-3">
            <span className="ag-choice-icon" aria-hidden="true"><Icon size={18} /></span>
            <span>
              <span className="fw-semibold d-block">{title}</span>
              <span className="small text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function RecentReports({ reports }: { reports: AccessibilityReport[] | null }) {
  return (
    <section className="mt-4 mt-lg-0" aria-labelledby="recent-heading">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <h2 id="recent-heading" className="h3 mb-0">Recently reported</h2>
        <Link to="/explore" className="btn btn-sm btn-ghost">
          <Compass size={16} aria-hidden="true" />
          Explore all
        </Link>
      </div>
      {reports === null ? (
        <ReportListSkeleton count={3} />
      ) : reports.length === 0 ? (
        <div className="ag-card ag-card-body text-center">
          <p className="small text-muted mb-2">No reports yet. Help others by reporting the first barrier you find.</p>
          <Link to="/reports/create" className="btn btn-accent btn-sm">
            <Plus size={16} aria-hidden="true" />
            Report an issue
          </Link>
        </div>
      ) : (
        <ul className="ag-list ag-list-plain">
          {reports.slice(0, 4).map((r) => (
            <li key={r.id}>
              <ReportCard report={r} showLocation />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
