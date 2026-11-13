import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Pencil, Send } from 'lucide-react'
import { reportsApi } from '@/features/reports/api'
import { accessibilityApi } from '@/features/accessibility/api'
import { parseApiError, type FieldErrors } from '@/lib/apiErrors'
import { CATEGORIES, SEVERITIES, getCategory } from '@/features/reports/meta'
import { useReportDraft, mapPlaceType, clearStoredDraft, type ReportDraft } from '@/features/reports/create/draft'
import LocationStep from '@/features/reports/create/LocationStep'
import PhotoStep, { MAX_PHOTOS, type PhotoUploadState } from '@/features/reports/create/PhotoStep'
import SubmittedView from '@/features/reports/create/SubmittedView'
import ChoiceCards from '@/components/ui/ChoiceCards'
import Notice from '@/components/ui/Notice'
import LoadingButton from '@/components/ui/LoadingButton'
import ConfirmDialog from '@/components/ConfirmDialog'
import SeverityIndicator from '@/components/SeverityIndicator'
import type { AccessibilityReport, ImpactLevel } from '@/types'

const STEPS = [
  { key: 'describe', title: 'Describe the problem', hint: 'A short title and what you saw.' },
  { key: 'category', title: 'What type of barrier is it?', hint: 'Pick the closest match.' },
  { key: 'severity', title: 'How serious is it?', hint: 'Think about someone using a wheelchair, cane or pram.' },
  { key: 'location', title: 'Where is it?', hint: 'Be as precise as you can so others can find it.' },
  { key: 'photos', title: 'Add photos', hint: 'Optional, but photos help others verify the issue.' },
  { key: 'review', title: 'Review and submit', hint: 'Check everything looks right.' },
] as const

const TITLE_MAX = 255
const DESCRIPTION_MIN = 10

type StepErrors = Partial<Record<'title' | 'description' | 'category' | 'severity' | 'location', string>>

function validateStep(index: number, d: ReportDraft): StepErrors {
  const e: StepErrors = {}
  if (index === 0) {
    if (!d.title.trim()) e.title = 'Add a short title.'
    else if (d.title.length > TITLE_MAX) e.title = `Keep the title under ${TITLE_MAX} characters.`
    if (!d.description.trim()) e.description = 'Describe the problem.'
    else if (d.description.trim().length < DESCRIPTION_MIN) e.description = 'Add a little more detail so others understand the problem.'
  }
  if (index === 1 && !d.category) e.category = 'Choose the type of barrier.'
  if (index === 2 && !d.severity) e.severity = 'Choose how serious it is.'
  if (index === 3 && !d.place) e.location = 'Choose a location by searching, using your location or picking on the map.'
  return e
}

type Phase = 'idle' | 'location' | 'report' | 'photos'

export default function ReportCreatePage() {
  const navigate = useNavigate()
  const { draft, update, reset, hasContent } = useReportDraft()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<StepErrors>({})
  const [photos, setPhotos] = useState<File[]>([])
  const [uploads, setUploads] = useState<Record<number, PhotoUploadState>>({})
  const [phase, setPhase] = useState<Phase>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [created, setCreated] = useState<AccessibilityReport | null>(null)
  const [failedPhotos, setFailedPhotos] = useState<File[]>([])
  const [retrying, setRetrying] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Move focus to the step heading whenever the step changes (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [step])

  const submitting = phase !== 'idle'
  const current = STEPS[step]

  const goNext = () => {
    const e = validateStep(step, draft)
    setErrors(e)
    if (Object.keys(e).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"], fieldset input[type="radio"]')?.focus())
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 0))
  }

  const jumpTo = (i: number) => {
    setErrors({})
    setStep(i)
  }

  const uploadPhotos = async (reportId: number, files: File[]) => {
    setPhase('photos')
    const failed: File[] = []
    for (let i = 0; i < files.length; i++) {
      setUploads((u) => ({ ...u, [i]: { progress: 0 } }))
      try {
        await reportsApi.uploadImage(reportId, files[i], (p) => setUploads((u) => ({ ...u, [i]: { progress: p } })))
        setUploads((u) => ({ ...u, [i]: { progress: 1 } }))
      } catch (err) {
        failed.push(files[i])
        setUploads((u) => ({ ...u, [i]: { progress: 0, error: parseApiError(err).message } }))
      }
    }
    return failed
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    // Re-validate every step in case the draft was restored from storage.
    for (let i = 0; i < STEPS.length - 1; i++) {
      const stepErrors = validateStep(i, draft)
      if (Object.keys(stepErrors).length) {
        setErrors(stepErrors)
        setStep(i)
        return
      }
    }
    setSubmitError(null)
    try {
      setPhase('location')
      const place = draft.place!
      const location = await accessibilityApi.create({
        name: place.name.slice(0, 255),
        location_type: mapPlaceType(place.type),
        address: place.address.slice(0, 500),
        latitude: place.lat,
        longitude: place.lng,
      })
      setPhase('report')
      const report = await reportsApi.create({
        location: location.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        accessibility_impact: draft.severity as ImpactLevel,
      })
      const failed = photos.length ? await uploadPhotos(report.id, photos) : []
      clearStoredDraft()
      setFailedPhotos(failed)
      setCreated(failed.length < photos.length ? await reportsApi.getById(report.id).catch(() => report) : report)
    } catch (err) {
      const parsed = parseApiError(err, 'Your report could not be submitted. Your answers are saved — please try again.')
      const fe: FieldErrors = parsed.fieldErrors
      const mapped: StepErrors = {}
      if (fe.title) mapped.title = fe.title.join(' ')
      if (fe.description) mapped.description = fe.description.join(' ')
      if (fe.category) mapped.category = fe.category.join(' ')
      if (fe.accessibility_impact) mapped.severity = fe.accessibility_impact.join(' ')
      if (fe.location || fe.latitude || fe.longitude || fe.name) mapped.location = 'There was a problem saving this location. Please choose it again.'
      setErrors(mapped)
      setSubmitError(parsed.message)
    } finally {
      setPhase('idle')
    }
  }

  const retryPhotos = async () => {
    if (!created) return
    setRetrying(true)
    setUploads({})
    const failed = await uploadPhotos(created.id, failedPhotos)
    setPhase('idle')
    setFailedPhotos(failed)
    setRetrying(false)
  }

  const startOver = () => {
    reset()
    setPhotos([])
    setUploads({})
    setCreated(null)
    setFailedPhotos([])
    setErrors({})
    setStep(0)
  }

  if (created) {
    return (
      <div className="ag-page ag-page-narrow">
        <SubmittedView report={created} failedPhotos={failedPhotos} onRetryPhotos={retryPhotos} retrying={retrying} onReportAnother={startOver} />
      </div>
    )
  }

  const phaseLabel =
    phase === 'location' ? 'Saving location…' : phase === 'report' ? 'Submitting report…' : phase === 'photos' ? 'Uploading photos…' : 'Submitting…'

  return (
    <div className="ag-page ag-page-narrow">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <p className="ag-eyebrow mb-0">Report an issue</p>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => (hasContent || photos.length ? setConfirmLeave(true) : navigate(-1))}>
          Cancel
        </button>
      </div>

      <div className="ag-stepper" aria-hidden="true">
        <div className="ag-stepper-bar">
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <form onSubmit={step === STEPS.length - 1 ? handleSubmit : (e) => { e.preventDefault(); goNext() }} noValidate aria-labelledby="step-heading">
        <p className="small text-muted mb-1">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 id="step-heading" ref={headingRef} tabIndex={-1} style={{ outline: 'none' }}>{current.title}</h1>
        <p className="text-muted">{current.hint}</p>

        <div className="ag-card ag-card-body">
          {step === 0 && (
            <div className="d-flex flex-column gap-3">
              <div>
                <label htmlFor="report-title" className="form-label">
                  Title<span className="ag-required" aria-hidden="true">*</span>
                </label>
                <input
                  id="report-title"
                  type="text"
                  className={`form-control${errors.title ? ' is-invalid' : ''}`}
                  value={draft.title}
                  maxLength={TITLE_MAX}
                  placeholder="e.g. Lift out of order at platform 2"
                  onChange={(e) => update({ title: e.target.value })}
                  aria-required="true"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'report-title-error' : 'report-title-help'}
                  autoComplete="off"
                  enterKeyHint="next"
                />
                {errors.title ? (
                  <div id="report-title-error" className="invalid-feedback">{errors.title}</div>
                ) : (
                  <div id="report-title-help" className="form-text">{draft.title.length}/{TITLE_MAX}</div>
                )}
              </div>
              <div>
                <label htmlFor="report-description" className="form-label">
                  What's the problem?<span className="ag-required" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="report-description"
                  className={`form-control${errors.description ? ' is-invalid' : ''}`}
                  rows={5}
                  value={draft.description}
                  placeholder="What did you see, and how does it affect access? e.g. The lift has been broken for a week; the only other route is 40 steps."
                  onChange={(e) => update({ description: e.target.value })}
                  aria-required="true"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'report-description-error' : 'report-description-help'}
                />
                {errors.description ? (
                  <div id="report-description-error" className="invalid-feedback">{errors.description}</div>
                ) : (
                  <div id="report-description-help" className="form-text">
                    After you submit, AI may suggest a category and severity from this description. You'll be able to accept or ignore them.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <ChoiceCards
              name="category"
              legend="Type of barrier"
              hideLegend
              choices={CATEGORIES.map((c) => ({ value: c.value, label: c.label, description: c.description, icon: c.icon }))}
              value={draft.category}
              onChange={(v) => {
                update({ category: v })
                setErrors({})
              }}
              error={errors.category}
            />
          )}

          {step === 2 && (
            <ChoiceCards
              name="severity"
              legend="Severity"
              hideLegend
              layout="list"
              choices={SEVERITIES.map((s) => ({
                value: s.value,
                label: s.label,
                description: s.description,
                visual: (
                  <span className="ag-choice-icon" aria-hidden="true" style={{ background: 'transparent' }}>
                    <span className="ag-severity" data-level={s.value}>
                      <span className="ag-severity-bars" style={{ transform: 'scale(1.4)' }}>
                        <span /><span /><span /><span />
                      </span>
                    </span>
                  </span>
                ),
              }))}
              value={draft.severity}
              onChange={(v) => {
                update({ severity: v as ImpactLevel })
                setErrors({})
              }}
              error={errors.severity}
            />
          )}

          {step === 3 && (
            <LocationStep
              value={draft.place}
              onChange={(place) => {
                update({ place })
                if (place) setErrors({})
              }}
              error={errors.location}
            />
          )}

          {step === 4 && <PhotoStep photos={photos} onChange={setPhotos} />}

          {step === 5 && (
            <ReviewSummary draft={draft} photos={photos} uploads={uploads} submitting={submitting} onEdit={jumpTo} onPhotosChange={setPhotos} />
          )}
        </div>

        {submitError && (
          <Notice tone="danger" className="mt-3">
            {submitError}
          </Notice>
        )}

        <div className="ag-action-bar">
          {step > 0 && (
            <button type="button" className="btn btn-outline-secondary btn-lg" onClick={goBack} disabled={submitting}>
              <ArrowLeft size={18} aria-hidden="true" />
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="submit" className="btn btn-primary btn-lg">
              {step === 4 && photos.length === 0 ? 'Skip photos' : 'Continue'}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          ) : (
            <LoadingButton type="submit" className="btn btn-accent btn-lg" loading={submitting} loadingText={phaseLabel} icon={<Send size={18} aria-hidden="true" />}>
              Submit report
            </LoadingButton>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmLeave}
        title="Discard this report?"
        message="Your answers and photos will be cleared."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => {
          reset()
          navigate('/')
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  )
}

interface ReviewSummaryProps {
  draft: ReportDraft
  photos: File[]
  uploads: Record<number, PhotoUploadState>
  submitting: boolean
  onEdit: (step: number) => void
  onPhotosChange: (photos: File[]) => void
}

function ReviewSummary({ draft, photos, uploads, submitting, onEdit, onPhotosChange }: ReviewSummaryProps) {
  const category = getCategory(draft.category)
  const CategoryIcon = category.icon
  const rows = [
    { step: 0, label: 'Title', value: <span className="fw-semibold ag-break">{draft.title}</span> },
    { step: 0, label: 'Description', value: <span className="ag-break" style={{ whiteSpace: 'pre-wrap' }}>{draft.description}</span> },
    {
      step: 1,
      label: 'Type',
      value: (
        <span className="d-inline-flex align-items-center gap-1">
          <CategoryIcon size={16} aria-hidden="true" />
          {category.label}
        </span>
      ),
    },
    { step: 2, label: 'Severity', value: draft.severity ? <SeverityIndicator level={draft.severity} showSuffix={false} /> : '—' },
    {
      step: 3,
      label: 'Location',
      value: draft.place ? (
        <span className="ag-break">
          <span className="fw-semibold d-block">{draft.place.name}</span>
          <span className="small text-muted">{draft.place.address}</span>
        </span>
      ) : (
        '—'
      ),
    },
  ]
  return (
    <div>
      <dl className="mb-0">
        {rows.map((r, i) => (
          <div key={r.label} className={`d-flex gap-3 py-3${i > 0 ? ' ag-divider' : ''}`} style={{ paddingTop: i === 0 ? 0 : undefined }}>
            <div className="flex-grow-1 ag-min-w-0">
              <dt className="ag-eyebrow mb-1">{r.label}</dt>
              <dd className="mb-0">{r.value}</dd>
            </div>
            {(i === 0 || rows[i - 1].step !== r.step) && (
              <button type="button" className="btn btn-sm btn-ghost align-self-start" onClick={() => onEdit(r.step)} disabled={submitting}>
                <Pencil size={14} aria-hidden="true" />
                Edit<span className="visually-hidden"> {r.label.toLowerCase()}</span>
              </button>
            )}
          </div>
        ))}
      </dl>
      <div className="ag-divider pt-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="ag-eyebrow">Photos ({photos.length}/{MAX_PHOTOS})</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onEdit(4)} disabled={submitting}>
            <Pencil size={14} aria-hidden="true" />
            Edit<span className="visually-hidden"> photos</span>
          </button>
        </div>
        {photos.length === 0 ? (
          <p className="small text-muted mb-0">No photos added.</p>
        ) : (
          <PhotoStep photos={photos} onChange={onPhotosChange} uploads={uploads} disabled={submitting} previewOnly />
        )}
      </div>
      <p className="small text-muted mt-3 mb-0">
        Your report will appear publicly as <strong>unverified</strong> until a moderator reviews it.
      </p>
    </div>
  )
}
