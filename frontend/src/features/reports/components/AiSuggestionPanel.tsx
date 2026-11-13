import { useCallback, useEffect, useState } from 'react'
import { Sparkles, LoaderCircle } from 'lucide-react'
import { aiApi } from '@/features/ai/api'
import { parseApiError } from '@/lib/apiErrors'
import { getCategory, getSeverity } from '@/features/reports/meta'
import SeverityIndicator from '@/components/SeverityIndicator'
import LoadingButton from '@/components/ui/LoadingButton'
import Notice from '@/components/ui/Notice'
import type { ClassificationReview, ReportClassification } from '@/types'

const POLL_MS = 3000
const MAX_POLLS = 6

interface AiSuggestionPanelProps {
  reportId: number
  /** The report's current (human-entered) values, shown alongside the suggestions. */
  currentCategory: string
  currentSeverity: string
  /** Called after "Accept" so the parent can reload the report's updated values. */
  onAccepted?: () => void
  /** Initial classification if already loaded with the report. */
  initial?: ReportClassification | null
}

/**
 * Real AI classification from GET /reports/{id}/classification/ (author or admin only).
 * Suggestions are labelled as such and never presented as verified facts.
 */
export default function AiSuggestionPanel({ reportId, currentCategory, currentSeverity, onAccepted, initial }: AiSuggestionPanelProps) {
  const [classification, setClassification] = useState<ReportClassification | null>(initial ?? null)
  const [reviews, setReviews] = useState<ClassificationReview[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        aiApi.getClassification(reportId),
        aiApi.getClassificationReviews(reportId).catch(() => [] as ClassificationReview[]),
      ])
      setClassification(c)
      setReviews(r)
      setLoadError(null)
      return c
    } catch (err) {
      setLoadError(parseApiError(err, 'AI suggestions could not be loaded.').message)
      return null
    }
  }, [reportId])

  // Classification normally completes during submission, but poll briefly if still pending.
  useEffect(() => {
    let cancelled = false
    let polls = 0
    let timer: number | undefined
    const tick = async () => {
      const c = await load()
      polls += 1
      if (!cancelled && c?.classification_status === 'pending' && polls < MAX_POLLS) {
        timer = window.setTimeout(tick, POLL_MS)
      }
    }
    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [load])

  const review = async (action: 'accept' | 'reject') => {
    setBusy(action)
    setActionError(null)
    try {
      const result = await aiApi.reviewClassification(reportId, action)
      setReviews((prev) => [result, ...(prev ?? [])])
      if (action === 'accept') onAccepted?.()
    } catch (err) {
      setActionError(parseApiError(err, 'Could not save your choice. Please try again.').message)
    } finally {
      setBusy(null)
    }
  }

  if (loadError) return null // AI is optional; never block the page on it.
  if (!classification) return null

  const status = classification.classification_status
  if (status === 'failed') {
    const reason = (classification.error_message || '').toLowerCase()
    const why = reason.includes('rate limit')
      ? 'The AI service has reached its usage limit for now.'
      : reason.includes('disabled') || reason.includes('not configured')
        ? 'AI suggestions are turned off on this server.'
        : reason.includes('timed out') || reason.includes('unavailable')
          ? 'The AI service was unavailable when this report was submitted.'
          : "We couldn't generate suggestions for this report."
    return (
      <Notice tone="neutral" title="AI suggestions unavailable">
        {why} This doesn't affect the report in any way — the category and severity entered by the reporter are used.
      </Notice>
    )
  }

  if (status === 'pending') {
    return (
      <section className="ag-ai-panel" aria-label="AI suggestions">
        <div className="d-flex align-items-center gap-2 small" role="status">
          <LoaderCircle size={16} className="ag-spin" aria-hidden="true" />
          Generating AI suggestions…
        </div>
      </section>
    )
  }

  const decided = reviews?.[0]
  const suggestedCategory = getCategory(classification.suggested_category)
  const sameCategory = classification.suggested_category === currentCategory
  const sameSeverity = classification.suggested_severity === currentSeverity
  const nothingToChange = sameCategory && sameSeverity

  return (
    <section className="ag-ai-panel" aria-labelledby={`ai-${reportId}-title`}>
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="ag-badge ag-badge-ai">
          <Sparkles size={13} aria-hidden="true" />
          AI
        </span>
        <h2 id={`ai-${reportId}-title`} className="h3 mb-0">AI suggestions</h2>
      </div>
      <p className="small text-muted mb-3">
        Generated automatically from the description. These are suggestions, not verified facts.
      </p>

      <dl>
        <dt>Category</dt>
        <dd>
          <strong>{suggestedCategory.label}</strong>
          {!sameCategory && currentCategory && <span className="text-muted"> (report says {getCategory(currentCategory).label})</span>}
        </dd>
        <dt>Severity</dt>
        <dd>
          {classification.suggested_severity ? <SeverityIndicator level={classification.suggested_severity} showSuffix={false} /> : '—'}
          {!sameSeverity && currentSeverity && <span className="text-muted small"> (report says {getSeverity(currentSeverity).label})</span>}
        </dd>
        {classification.summary && (
          <>
            <dt>Summary</dt>
            <dd>{classification.summary}</dd>
          </>
        )}
        {classification.keywords?.length > 0 && (
          <>
            <dt>Keywords</dt>
            <dd>
              {classification.keywords.map((k) => (
                <span key={k} className="ag-keyword">{k}</span>
              ))}
            </dd>
          </>
        )}
      </dl>

      {decided ? (
        <p className="small mb-0 mt-3" role="status">
          {decided.action === 'accept'
            ? 'You accepted these suggestions — the report was updated.'
            : 'You kept your own category and severity.'}
        </p>
      ) : nothingToChange ? (
        <p className="small text-muted mb-0 mt-3">The suggestions match what the report already says.</p>
      ) : (
        <div className="d-flex flex-wrap gap-2 mt-3">
          <LoadingButton className="btn btn-sm btn-primary" loading={busy === 'accept'} disabled={!!busy} onClick={() => review('accept')}>
            Accept suggestions
          </LoadingButton>
          <LoadingButton className="btn btn-sm btn-outline-secondary" loading={busy === 'reject'} disabled={!!busy} onClick={() => review('reject')}>
            Keep my choices
          </LoadingButton>
        </div>
      )}
      {actionError && <Notice tone="danger" className="mt-2">{actionError}</Notice>}
    </section>
  )
}
