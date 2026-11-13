import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleCheck, Plus, ArrowRight } from 'lucide-react'
import { reportsApi } from '@/features/reports/api'
import { parseApiError } from '@/lib/apiErrors'
import AiSuggestionPanel from '@/features/reports/components/AiSuggestionPanel'
import DuplicateWarning from '@/features/reports/components/DuplicateWarning'
import ConfirmDialog from '@/components/ConfirmDialog'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'
import { useToast } from '@/components/ui/Toast'
import type { AccessibilityReport } from '@/types'

interface SubmittedViewProps {
  report: AccessibilityReport
  failedPhotos: File[]
  onRetryPhotos: () => Promise<void>
  retrying: boolean
  onReportAnother: () => void
}

/** Shown after a successful submission: real AI suggestions + duplicate check for the new report. */
export default function SubmittedView({ report: initialReport, failedPhotos, onRetryPhotos, retrying, onReportAnother }: SubmittedViewProps) {
  const [report, setReport] = useState(initialReport)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => headingRef.current?.focus(), [])

  const reload = async () => {
    try {
      setReport(await reportsApi.getById(report.id))
    } catch {
      /* keep showing what we have */
    }
  }

  const withdraw = async () => {
    setWithdrawing(true)
    setWithdrawError(null)
    try {
      await reportsApi.delete(report.id)
      toast.success('Your report was withdrawn.')
      navigate('/my-reports', { replace: true })
    } catch (err) {
      setWithdrawError(parseApiError(err, 'Could not withdraw the report.').message)
      setWithdrawing(false)
    }
  }

  return (
    <div className="d-flex flex-column gap-3">
      <section className="ag-card ag-card-body text-center">
        <div className="ag-empty-icon" style={{ background: 'var(--ag-success-soft)', color: 'var(--ag-success)' }} aria-hidden="true">
          <CircleCheck size={28} />
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="h2" style={{ outline: 'none' }}>Thanks — your report is in</h1>
        <p className="text-muted mb-0">
          “{report.title}” is now visible to the community as <strong>unverified</strong> until a moderator reviews it.
        </p>
      </section>

      {failedPhotos.length > 0 && (
        <Notice
          tone="warning"
          title={`${failedPhotos.length} photo${failedPhotos.length === 1 ? '' : 's'} couldn't be uploaded`}
          action={
            <LoadingButton className="btn btn-sm btn-outline-secondary" loading={retrying} onClick={onRetryPhotos}>
              Try uploading again
            </LoadingButton>
          }
        >
          Your report was saved without them.
        </Notice>
      )}

      <DuplicateWarning reportId={report.id} onWithdraw={() => setConfirmWithdraw(true)} />

      <AiSuggestionPanel
        reportId={report.id}
        currentCategory={report.category}
        currentSeverity={report.accessibility_impact}
        initial={report.classification ?? null}
        onAccepted={reload}
      />

      <div className="d-flex flex-column flex-sm-row gap-2">
        <Link to={`/reports/${report.id}`} className="btn btn-primary btn-lg flex-grow-1">
          View my report
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <button type="button" className="btn btn-outline-primary btn-lg flex-grow-1" onClick={onReportAnother}>
          <Plus size={18} aria-hidden="true" />
          Report another issue
        </button>
      </div>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw your report?"
        message="Your report will be deleted. You can confirm the existing report instead to show the issue is still there."
        confirmLabel="Withdraw report"
        tone="danger"
        busy={withdrawing}
        error={withdrawError}
        onConfirm={withdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  )
}
