import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, ExternalLink, MapPin, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { reportsApi } from '@/features/reports/api'
import { verificationApi } from '@/features/verification/api'
import { parseApiError } from '@/lib/apiErrors'
import { formatDate, getCategory, getStatus, reportTitle } from '@/features/reports/meta'
import AiSuggestionPanel from '@/features/reports/components/AiSuggestionPanel'
import DuplicateWarning from '@/features/reports/components/DuplicateWarning'
import CommunityVerification from '@/features/reports/components/CommunityVerification'
import JourneyMap from '@/components/journey/JourneyMap'
import StatusBadge from '@/components/StatusBadge'
import SeverityIndicator from '@/components/SeverityIndicator'
import EmptyState from '@/components/EmptyState'
import ErrorMessage from '@/components/ErrorMessage'
import ConfirmDialog from '@/components/ConfirmDialog'
import Dialog from '@/components/ui/Dialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { AccessibilityReport, ReportVerification } from '@/types'

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const reportId = Number(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { user, isAdmin } = useAuth()

  const [report, setReport] = useState<AccessibilityReport | null>(null)
  const [verifications, setVerifications] = useState<ReportVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; status: number | null } | null>(null)
  const [photoIndex, setPhotoIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(reportId)) {
      setError({ message: 'Report not found.', status: 404 })
      setLoading(false)
      return
    }
    try {
      const [r, v] = await Promise.all([reportsApi.getById(reportId), verificationApi.getVerifications(reportId).catch(() => [])])
      setReport(r)
      setVerifications(v)
      setError(null)
    } catch (err) {
      const parsed = parseApiError(err, 'This report could not be loaded.')
      setError({ message: parsed.message, status: parsed.status })
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const deleteReport = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await reportsApi.delete(reportId)
      toast.success('Report deleted.')
      navigate('/my-reports', { replace: true })
    } catch (err) {
      setDeleteError(parseApiError(err, 'Could not delete the report.').message)
      setDeleting(false)
    }
  }

  const back = (
    <button type="button" className="btn btn-sm btn-ghost mb-2 ps-0" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/explore'))}>
      <ArrowLeft size={16} aria-hidden="true" />
      Back
    </button>
  )

  if (loading) {
    return (
      <div className="ag-page ag-page-medium" role="status" aria-label="Loading report">
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={28} style={{ marginTop: 12 }} />
        <Skeleton width="60%" height={20} style={{ marginTop: 12 }} />
        <Skeleton height={200} style={{ marginTop: 20, borderRadius: 12 }} />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="ag-page ag-page-medium">
        {back}
        {error?.status === 404 ? (
          <div className="ag-card">
            <EmptyState title="Report not found" description="It may have been removed by its author." action={{ label: 'Explore reports', to: '/explore' }} />
          </div>
        ) : (
          <ErrorMessage message={error?.message ?? 'This report could not be loaded.'} onRetry={() => { setLoading(true); load() }} />
        )}
      </div>
    )
  }

  const isAuthor = !!user && report.author === user.email
  const category = getCategory(report.category)
  const CategoryIcon = category.icon
  const status = getStatus(report.status)
  const loc = report.location_detail
  const coords = loc ? { lat: Number(loc.latitude), lng: Number(loc.longitude) } : null

  return (
    <div className="ag-page ag-page-medium">
      {back}
      <header className="mb-3">
        <h1 className="ag-break mb-2">{reportTitle(report)}</h1>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <StatusBadge status={report.status} />
          <SeverityIndicator level={report.accessibility_impact} />
          <span className="ag-badge ag-badge-neutral">
            <CategoryIcon size={13} aria-hidden="true" />
            {category.label}
          </span>
        </div>
        <p className="small text-muted mt-2 mb-0 d-flex align-items-center gap-1">
          <Calendar size={14} aria-hidden="true" />
          Reported {formatDate(report.created_at)}
          {isAuthor && ' by you'}
          {report.updated_at !== report.created_at && ` · updated ${formatDate(report.updated_at)}`}
        </p>
      </header>

      <div className="row g-3">
        <div className="col-lg-7 d-flex flex-column gap-3">
          {isAuthor && <DuplicateWarning reportId={report.id} />}

          {report.images?.length > 0 && (
            <section aria-label={`Photos (${report.images.length})`}>
              <div className="ag-gallery">
                {report.images.map((img, i) => (
                  <button key={img.id} type="button" onClick={() => setPhotoIndex(i)} aria-label={`Open photo ${i + 1} of ${report.images.length}`}>
                    <img src={img.image} alt={`Photo ${i + 1} of the reported issue`} loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="ag-card ag-card-body" aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="h3">Description</h2>
            <p className="mb-0 ag-break" style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
          </section>

          <CommunityVerification report={report} verifications={verifications} currentUserEmail={user?.email ?? null} onChanged={load} />
        </div>

        <div className="col-lg-5 d-flex flex-column gap-3">
          <section className="ag-card ag-card-body" aria-labelledby="mod-heading">
            <div className="d-flex align-items-center gap-2 mb-1">
              <ShieldCheck size={18} aria-hidden="true" />
              <h2 id="mod-heading" className="h3 mb-0">Moderator status</h2>
            </div>
            <div className="my-2"><StatusBadge status={report.status} /></div>
            <p className="small text-muted mb-0">{status.description}</p>
          </section>

          <section className="ag-card overflow-hidden" aria-labelledby="loc-heading">
            {coords && (
              <JourneyMap route={[]} reports={[report]} focusPoint={coords} className="ag-map ag-map-compact rounded-0 border-0" label={`Map showing ${loc?.name ?? 'the report location'}`} />
            )}
            <div className="ag-card-body">
              <h2 id="loc-heading" className="h3 d-flex align-items-center gap-2">
                <MapPin size={18} aria-hidden="true" /> Location
              </h2>
              {loc ? (
                <>
                  <div className="fw-semibold ag-break">{loc.name}</div>
                  {loc.address && loc.address !== loc.name && <div className="small text-muted ag-break">{loc.address}</div>}
                  <a
                    className="btn btn-sm btn-ghost ps-0 mt-1"
                    href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=18/${loc.latitude}/${loc.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in OpenStreetMap
                    <ExternalLink size={14} aria-hidden="true" />
                    <span className="visually-hidden">(opens in a new tab)</span>
                  </a>
                </>
              ) : (
                <p className="small text-muted mb-0">Location details aren't available.</p>
              )}
            </div>
          </section>

          {(isAuthor || isAdmin) && (
            <AiSuggestionPanel
              reportId={report.id}
              currentCategory={report.category}
              currentSeverity={report.accessibility_impact}
              initial={report.classification ?? null}
              onAccepted={load}
            />
          )}

          {isAuthor && (
            <section className="ag-card ag-card-body" aria-labelledby="manage-heading">
              <h2 id="manage-heading" className="h3">Manage your report</h2>
              <p className="small text-muted">If you reported this by mistake, you can delete it.</p>
              <button type="button" className="btn btn-outline-secondary text-danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} aria-hidden="true" />
                Delete report
              </button>
            </section>
          )}
        </div>
      </div>

      <Dialog
        open={photoIndex !== null}
        onClose={() => setPhotoIndex(null)}
        title={photoIndex !== null ? `Photo ${photoIndex + 1} of ${report.images.length}` : ''}
        variant="full"
        size="lg"
        footer={
          report.images.length > 1 ? (
            <>
              <button type="button" className="btn btn-outline-secondary" disabled={!photoIndex} onClick={() => setPhotoIndex((i) => (i ?? 0) - 1)}>Previous</button>
              <button type="button" className="btn btn-outline-secondary" disabled={photoIndex === report.images.length - 1} onClick={() => setPhotoIndex((i) => (i ?? 0) + 1)}>Next</button>
            </>
          ) : undefined
        }
      >
        {photoIndex !== null && (
          <img src={report.images[photoIndex].image} alt={`Photo ${photoIndex + 1} of the reported issue`} className="d-block mx-auto rounded" style={{ maxHeight: '70dvh', objectFit: 'contain' }} />
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this report?"
        message="The report, its photos and community votes will be removed permanently."
        confirmLabel="Delete report"
        tone="danger"
        busy={deleting}
        error={deleteError}
        onConfirm={deleteReport}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
