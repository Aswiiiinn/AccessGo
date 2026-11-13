import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Ban, ExternalLink, MessageSquare, ThumbsDown, ThumbsUp, Wrench } from 'lucide-react'
import { adminReportsApi } from '@/features/reports/api'
import { parseApiError } from '@/lib/apiErrors'
import { formatDate, getCategory } from '@/features/reports/meta'
import AiSuggestionPanel from '@/features/reports/components/AiSuggestionPanel'
import Dialog from '@/components/ui/Dialog'
import LoadingButton from '@/components/ui/LoadingButton'
import Notice from '@/components/ui/Notice'
import StatusBadge from '@/components/StatusBadge'
import SeverityIndicator from '@/components/SeverityIndicator'
import LoadingSpinner from '@/components/LoadingSpinner'
import ErrorMessage from '@/components/ErrorMessage'
import { useToast } from '@/components/ui/Toast'
import type { AdminReportDetail, ModerationAction } from '@/types'

interface ActionConfig {
  label: string
  title: string
  message: string
  tone: 'primary' | 'danger'
  icon: typeof BadgeCheck
  reason?: { label: string; placeholder: string; required?: boolean }
}

const ACTIONS: Record<ModerationAction, ActionConfig> = {
  verify: {
    label: 'Verify',
    title: 'Verify this report?',
    message: 'It will be shown publicly as verified by a moderator.',
    tone: 'primary',
    icon: BadgeCheck,
    reason: { label: 'Note (optional)', placeholder: 'Anything other moderators should know' },
  },
  reject: {
    label: 'Reject',
    title: 'Reject this report?',
    message: 'The reporter will see the reason you give. Rejected reports cannot receive new community votes.',
    tone: 'danger',
    icon: Ban,
    reason: { label: 'Reason for rejection', placeholder: 'e.g. Duplicate of an existing report; photo shows a different location', required: true },
  },
  resolve: {
    label: 'Mark resolved',
    title: 'Mark as resolved?',
    message: 'Use this when the barrier has been fixed.',
    tone: 'primary',
    icon: Wrench,
    reason: { label: 'Note (optional)', placeholder: 'e.g. Lift repaired on 3 May' },
  },
  request_info: {
    label: 'Request info',
    title: 'Request more information?',
    message: 'The report stays pending and the request is recorded in its history.',
    tone: 'primary',
    icon: MessageSquare,
    reason: { label: 'What do you need?', placeholder: 'e.g. Please add a photo of the entrance', required: true },
  },
}

/** Which actions the backend allows from each status (see accounts/services.py). */
const AVAILABLE: Record<string, ModerationAction[]> = {
  pending: ['verify', 'reject', 'request_info'],
  verified: ['resolve'],
  rejected: [],
  resolved: [],
}

interface ModerationDialogProps {
  reportId: number | null
  onClose: () => void
  onChanged: () => void
}

export default function ModerationDialog({ reportId, onClose, onChanged }: ModerationDialogProps) {
  const toast = useToast()
  const [report, setReport] = useState<AdminReportDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<ModerationAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [reasonTouched, setReasonTouched] = useState(false)
  const reasonId = useId()

  const load = useCallback(async () => {
    if (reportId === null) return
    setError(null)
    try {
      setReport(await adminReportsApi.getById(reportId))
    } catch (err) {
      setError(parseApiError(err, 'Could not load the report.').message)
    }
  }, [reportId])

  useEffect(() => {
    setReport(null)
    load()
  }, [load])

  const startAction = (a: ModerationAction) => {
    setActionError(null)
    setReason('')
    setReasonTouched(false)
    setPending(a)
  }

  const reasonMissing = !!pending && !!ACTIONS[pending].reason?.required && !reason.trim()

  const run = async () => {
    if (!report || !pending) return
    setReasonTouched(true)
    if (reasonMissing) return
    setBusy(true)
    setActionError(null)
    try {
      const text = reason.trim()
      const fn = {
        verify: () => adminReportsApi.verify(report.id, text),
        reject: () => adminReportsApi.reject(report.id, text),
        resolve: () => adminReportsApi.resolve(report.id, text),
        request_info: () => adminReportsApi.requestInfo(report.id, text),
      }[pending]
      setReport(await fn())
      const done: Record<ModerationAction, string> = {
        verify: 'Report verified.',
        reject: 'Report rejected.',
        resolve: 'Report marked as resolved.',
        request_info: 'Information requested from the reporter.',
      }
      toast.success(done[pending])
      setPending(null)
      onChanged()
    } catch (err) {
      setActionError(parseApiError(err, 'The action could not be completed.').message)
    } finally {
      setBusy(false)
    }
  }

  const available = report ? AVAILABLE[report.status] ?? [] : []

  return (
    <>
      <Dialog
        open={reportId !== null}
        onClose={() => {
          setPending(null)
          onClose()
        }}
        title={pending ? ACTIONS[pending].title : report ? `Report #${report.id}` : 'Report'}
        variant="full"
        size="lg"
        dismissible={!busy}
        footer={
          pending ? (
            <>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setPending(null)} disabled={busy}>
                Back to report
              </button>
              <LoadingButton className={`btn ${ACTIONS[pending].tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} loading={busy} onClick={run}>
                {ACTIONS[pending].label}
              </LoadingButton>
            </>
          ) : report && available.length > 0 ? (
            <>
              {available.map((a) => {
                const Icon = ACTIONS[a].icon
                return (
                  <button
                    key={a}
                    type="button"
                    className={`btn ${a === 'reject' ? 'btn-outline-secondary text-danger' : a === 'verify' || a === 'resolve' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => startAction(a)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {ACTIONS[a].label}
                  </button>
                )
              })}
            </>
          ) : undefined
        }
      >
        {error && <ErrorMessage message={error} onRetry={load} />}
        {!report && !error && <LoadingSpinner label="Loading report…" />}
        {report && pending && (
          <div>
            <p className="fw-semibold ag-break mb-1">“{report.title}”</p>
            <p>{ACTIONS[pending].message}</p>
            {ACTIONS[pending].reason && (
              <>
                <label htmlFor={reasonId} className="form-label">
                  {ACTIONS[pending].reason!.label}
                  {ACTIONS[pending].reason!.required && <span className="ag-required" aria-hidden="true">*</span>}
                </label>
                <textarea
                  id={reasonId}
                  className={`form-control${reasonTouched && reasonMissing ? ' is-invalid' : ''}`}
                  rows={4}
                  value={reason}
                  placeholder={ACTIONS[pending].reason!.placeholder}
                  onChange={(e) => setReason(e.target.value)}
                  aria-required={ACTIONS[pending].reason!.required}
                  aria-invalid={reasonTouched && reasonMissing}
                  aria-describedby={reasonTouched && reasonMissing ? `${reasonId}-err` : undefined}
                  autoFocus
                />
                {reasonTouched && reasonMissing && <div id={`${reasonId}-err`} className="invalid-feedback">Please enter a reason.</div>}
              </>
            )}
            {actionError && <Notice tone="danger" className="mt-3">{actionError}</Notice>}
          </div>
        )}
        {report && !pending && (
          <div className="d-flex flex-column gap-3">
            <div>
              <h3 className="h2 ag-break mb-2">{report.title}</h3>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <StatusBadge status={report.status} />
                <SeverityIndicator level={report.severity} />
                <span className="ag-badge ag-badge-neutral">{getCategory(report.category).label}</span>
              </div>
              <p className="small text-muted mt-2 mb-0">
                Submitted {formatDate(report.creation_timestamp)} by {report.creator?.full_name || report.creator?.email}
              </p>
            </div>

            <section>
              <h4 className="h6">Report values (entered by the reporter)</h4>
              <p className="mb-2 ag-break" style={{ whiteSpace: 'pre-wrap' }}>{report.description}</p>
              {report.location && (
                <p className="small text-muted mb-0 ag-break">
                  {report.location.name}
                  {report.location.address && report.location.address !== report.location.name ? ` — ${report.location.address}` : ''}
                </p>
              )}
            </section>

            {report.uploaded_photographs.length > 0 && (
              <div className="ag-gallery" aria-label="Photos">
                {report.uploaded_photographs.map((p, i) => (
                  <a key={p.id} href={p.image} target="_blank" rel="noopener noreferrer" className="d-block flex-shrink-0 rounded overflow-hidden" style={{ width: 160, aspectRatio: '4/3' }}>
                    <img src={p.image} alt={`Photo ${i + 1} (opens in a new tab)`} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
            )}

            <AiSuggestionPanel reportId={report.id} currentCategory={report.category} currentSeverity={report.severity} initial={report.classification ?? null} onAccepted={() => { load(); onChanged() }} />

            <section>
              <h4 className="h6">Community verification</h4>
              <p className="small mb-0 d-flex gap-3">
                <span className="d-inline-flex align-items-center gap-1"><ThumbsUp size={14} aria-hidden="true" /> {report.positive_verification_count} confirmed</span>
                <span className="d-inline-flex align-items-center gap-1"><ThumbsDown size={14} aria-hidden="true" /> {report.negative_verification_count} disputed</span>
              </p>
            </section>

            {report.administrative_review_history.length > 0 && (
              <section>
                <h4 className="h6">Moderation history</h4>
                <ol className="list-unstyled small d-flex flex-column gap-2 mb-0">
                  {report.administrative_review_history.map((h) => (
                    <li key={h.id} className="p-2 rounded" style={{ background: 'var(--ag-surface-muted)' }}>
                      <strong>{ACTIONS[h.action]?.label ?? h.action}</strong> by {h.admin?.full_name || h.admin?.email} · {formatDate(h.created_at)}
                      {h.review_comment && <div className="ag-break mt-1">“{h.review_comment}”</div>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {available.length === 0 && <p className="small text-muted mb-0">No further moderation actions are available for a {report.status} report.</p>}

            <Link to={`/reports/${report.id}`} className="small" target="_blank" rel="noopener noreferrer">
              Open public page <ExternalLink size={12} aria-hidden="true" /><span className="visually-hidden">(opens in a new tab)</span>
            </Link>
          </div>
        )}
      </Dialog>
    </>
  )
}
