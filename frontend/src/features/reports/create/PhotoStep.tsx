import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import Notice from '@/components/ui/Notice'

// Mirrors apps/reports/validators.py
export const MAX_PHOTOS = 5
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface PhotoUploadState {
  /** 0–1 while uploading, 1 when done. */
  progress: number
  error?: string
}

interface PhotoStepProps {
  photos: File[]
  onChange: (photos: File[]) => void
  /** Per-photo upload state, keyed by index (shown during submission). */
  uploads?: Record<number, PhotoUploadState>
  disabled?: boolean
  /** Thumbnails only (used on the review step). */
  previewOnly?: boolean
}

export default function PhotoStep({ photos, onChange, uploads, disabled, previewOnly = false }: PhotoStepProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const problems: string[] = []
    const accepted: File[] = []
    for (const file of Array.from(list)) {
      if (photos.length + accepted.length >= MAX_PHOTOS) {
        problems.push(`You can add up to ${MAX_PHOTOS} photos.`)
        break
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        problems.push(`“${file.name}” isn't a JPG, PNG or WebP image.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        problems.push(`“${file.name}” is larger than 5 MB.`)
        continue
      }
      accepted.push(file)
    }
    setErrors(problems)
    if (accepted.length) onChange([...photos, ...accepted])
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  const remove = (index: number) => {
    setErrors([])
    onChange(photos.filter((_, i) => i !== index))
  }

  const full = photos.length >= MAX_PHOTOS

  return (
    <div className="d-flex flex-column gap-3">
      {!previewOnly && (
      <>
      <div className="d-grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <button type="button" className="btn btn-outline-primary btn-lg" onClick={() => cameraRef.current?.click()} disabled={full || disabled}>
          <Camera size={20} aria-hidden="true" />
          Take photo
        </button>
        <button type="button" className="btn btn-outline-primary btn-lg" onClick={() => galleryRef.current?.click()} disabled={full || disabled}>
          <ImagePlus size={20} aria-hidden="true" />
          Choose photos
        </button>
      </div>
      {/* capture="environment" opens the rear camera on phones; desktops fall back to a file picker. */}
      <input ref={cameraRef} type="file" accept={ALLOWED_TYPES.join(',')} capture="environment" className="d-none" onChange={(e) => addFiles(e.target.files)} tabIndex={-1} aria-hidden="true" />
      <input ref={galleryRef} type="file" accept={ALLOWED_TYPES.join(',')} multiple className="d-none" onChange={(e) => addFiles(e.target.files)} tabIndex={-1} aria-hidden="true" />

      <p className="small text-muted mb-0" aria-live="polite">
        {photos.length} of {MAX_PHOTOS} photos added · JPG, PNG or WebP up to 5 MB each.
      </p>

      </>
      )}

      {errors.length > 0 && (
        <Notice tone="danger">
          <ul className="mb-0 ps-3">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </Notice>
      )}

      {photos.length > 0 && (
        <ul className="ag-photo-grid list-unstyled mb-0">
          {photos.map((file, i) => {
            const upload = uploads?.[i]
            return (
              <li key={`${file.name}-${file.lastModified}-${i}`} className="ag-photo">
                <img src={previews[i]} alt={`Photo ${i + 1}: ${file.name}`} />
                {!disabled && (
                  <button type="button" className="ag-photo-remove" onClick={() => remove(i)} aria-label={`Remove photo ${i + 1}`}>
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
                {upload && (
                  <div className="position-absolute bottom-0 start-0 end-0 p-1" style={{ background: 'rgba(16,32,59,.65)' }}>
                    {upload.error ? (
                      <span className="ag-caption text-white">Failed</span>
                    ) : (
                      <div
                        className="progress"
                        style={{ height: 6 }}
                        role="progressbar"
                        aria-label={`Uploading photo ${i + 1}`}
                        aria-valuenow={Math.round(upload.progress * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div className="progress-bar" style={{ width: `${upload.progress * 100}%`, background: 'var(--ag-teal)' }} />
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
