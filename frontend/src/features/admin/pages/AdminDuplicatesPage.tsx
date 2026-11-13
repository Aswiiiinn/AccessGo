import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Check, Copy, X } from 'lucide-react'
import { usersApi } from '@/features/users/api'
import { parseApiError } from '@/lib/apiErrors'
import { formatDate } from '@/features/reports/meta'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import ErrorMessage from '@/components/ErrorMessage'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/ui/PageHeader'
import { ReportListSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import type { PotentialDuplicate } from '@/types'

const FILTERS = [
  { value: 'suggested', label: 'To review' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: '', label: 'All' },
]

export default function AdminDuplicatesPage() {
  const toast = useToast()
  const [status, setStatus] = useState('suggested')
  const [items, setItems] = useState<PotentialDuplicate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ dup: PotentialDuplicate; action: 'confirm' | 'dismiss' } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setItems(null)
    setError(null)
    try {
      setItems(await usersApi.getPotentialDuplicates({ status }))
    } catch (err) {
      setError(parseApiError(err, 'Could not load duplicate suggestions.').message)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const review = async (reason: string) => {
    if (!pending) return
    setBusy(true)
    setActionError(null)
    try {
      await usersApi.reviewDuplicate(pending.dup.id, pending.action, reason)
      toast.success(pending.action === 'confirm' ? 'Marked as a duplicate.' : 'Suggestion dismissed.')
      setPending(null)
      load()
    } catch (err) {
      setActionError(parseApiError(err, 'Could not save the review.').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Potential duplicates" description="Pairs of reports the system thinks may describe the same barrier." />
      <div className="ag-chips mb-3" role="group" aria-label="Filter by review status">
        {FILTERS.map((f) => (
          <button key={f.label} type="button" className="ag-chip" aria-pressed={status === f.value} onClick={() => setStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}
      {!items && !error ? (
        <ReportListSkeleton count={3} label="Loading duplicates" />
      ) : items && items.length === 0 ? (
        <div className="ag-card">
          <EmptyState icon={Copy} title={status === 'suggested' ? 'Nothing to review' : 'No suggestions here'} description="Duplicate suggestions are created automatically when similar reports are submitted nearby." />
        </div>
      ) : (
        <ul className="ag-list ag-list-plain">
          {items?.map((d) => (
            <li key={d.id} className="ag-card ag-card-body">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                <StatusBadge status={d.status} />
                <span className="small text-muted">
                  {d.similarity_score != null && <>Similarity {Math.round(d.similarity_score * 100)}% · </>}
                  {d.detection_method && <>{d.detection_method.replace(/_/g, ' ')} · </>}
                  {formatDate(d.created_at)}
                </span>
              </div>
              <div className="row g-2 align-items-center">
                <div className="col-md">
                  <div className="ag-eyebrow">New report #{d.source_report}</div>
                  <Link to={`/reports/${d.source_report}`} target="_blank" rel="noopener noreferrer" className="fw-semibold ag-break">
                    {d.source_report_title ?? `Report #${d.source_report}`}
                  </Link>
                </div>
                <div className="col-md-auto text-muted d-none d-md-block" aria-hidden="true"><ArrowLeftRight size={18} /></div>
                <div className="col-md">
                  <div className="ag-eyebrow">Possible match #{d.matched_report}</div>
                  <Link to={`/reports/${d.matched_report}`} target="_blank" rel="noopener noreferrer" className="fw-semibold ag-break">
                    {d.matched_report_title ?? `Report #${d.matched_report}`}
                  </Link>
                </div>
              </div>
              {d.status === 'suggested' && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => { setActionError(null); setPending({ dup: d, action: 'confirm' }) }}>
                    <Check size={16} aria-hidden="true" />
                    Confirm duplicate
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setActionError(null); setPending({ dup: d, action: 'dismiss' }) }}>
                    <X size={16} aria-hidden="true" />
                    Not a duplicate
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.action === 'confirm' ? 'Confirm duplicate?' : 'Dismiss suggestion?'}
        message={
          pending?.action === 'confirm'
            ? 'This records that both reports describe the same barrier. Neither report is deleted.'
            : 'This records that the reports describe different barriers.'
        }
        confirmLabel={pending?.action === 'confirm' ? 'Confirm duplicate' : 'Dismiss'}
        reason={{ label: 'Note (optional)', placeholder: 'Why you made this decision' }}
        busy={busy}
        error={actionError}
        onConfirm={review}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
