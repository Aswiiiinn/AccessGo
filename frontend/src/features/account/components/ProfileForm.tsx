import { useEffect, useRef, useState, type FormEvent } from 'react'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/context/AuthContext'
import { parseApiError, type FieldErrors } from '@/lib/apiErrors'
import UserAvatar from '@/components/account/UserAvatar'
import type { ProfileUpdateRequest, UserProfile } from '@/types'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // matches UserProfileSerializer.MAX_AVATAR_BYTES
const USERNAME_PATTERN = /^[\w.@+-]+$/ // Django's UnicodeUsernameValidator

interface ProfileFormProps {
  profile: UserProfile
}

/** Edits the writable fields of GET/PATCH /auth/profile/: username, full_name, bio, avatar. */
export default function ProfileForm({ profile }: ProfileFormProps) {
  const { setUser } = useAuth()
  const [username, setUsername] = useState(profile.username)
  const [fullName, setFullName] = useState(profile.full_name)
  const [bio, setBio] = useState(profile.bio)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!avatarFile) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (file: File | undefined) => {
    setFieldErrors((prev) => ({ ...prev, avatar: [] }))
    if (!file) {
      setAvatarFile(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, avatar: ['Please choose an image file.'] }))
      resetFileInput()
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFieldErrors((prev) => ({ ...prev, avatar: ['Profile picture must be 2 MB or smaller.'] }))
      resetFileInput()
      return
    }
    setRemoveAvatar(false)
    setAvatarFile(file)
  }

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {}
    const u = username.trim()
    if (!u) errs.username = ['Username is required.']
    else if (u.length > 150) errs.username = ['Username must be 150 characters or fewer.']
    else if (!USERNAME_PATTERN.test(u)) errs.username = ['Use only letters, numbers and @ . + - _ characters.']
    if (fullName.length > 255) errs.full_name = ['Full name must be 255 characters or fewer.']
    return errs
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(null)
    setError(null)
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const payload: ProfileUpdateRequest = { username: username.trim(), full_name: fullName.trim(), bio }
    if (avatarFile) payload.avatar = avatarFile
    else if (removeAvatar) payload.avatar = null

    setSaving(true)
    try {
      const updated = await authApi.updateProfile(payload)
      setUser(updated)
      setUsername(updated.username)
      setFullName(updated.full_name)
      setBio(updated.bio)
      setAvatarFile(null)
      setRemoveAvatar(false)
      resetFileInput()
      setSuccess('Your profile has been updated.')
    } catch (err) {
      const parsed = parseApiError(err, 'Could not save your profile. Please try again.')
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setSaving(false)
    }
  }

  const fieldClass = (name: string) => `form-control${fieldErrors[name]?.length ? ' is-invalid' : ''}`
  const fieldError = (name: string) =>
    fieldErrors[name]?.length ? (
      <div id={`profile-${name}-error`} className="invalid-feedback d-block">
        {fieldErrors[name].join(' ')}
      </div>
    ) : null
  const describedBy = (name: string, extra?: string) =>
    [fieldErrors[name]?.length ? `profile-${name}-error` : null, extra].filter(Boolean).join(' ') || undefined

  const shownAvatar = removeAvatar ? null : previewUrl ?? profile.avatar

  return (
    <form onSubmit={handleSubmit} noValidate>
      {success && <div className="ag-notice ag-notice-success mb-3" role="status">{success}</div>}
      {error && <div className="ag-notice ag-notice-danger mb-3" role="alert">{error}</div>}

      <fieldset disabled={saving}>
        <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 mb-4">
          <UserAvatar user={profile} size={80} src={shownAvatar} />
          <div className="flex-grow-1">
            <label htmlFor="profile-avatar" className="form-label mb-1">Profile picture</label>
            <input
              ref={fileInputRef}
              id="profile-avatar"
              type="file"
              accept="image/*"
              className={`form-control${fieldErrors.avatar?.length ? ' is-invalid' : ''}`}
              onChange={(e) => handleFile(e.target.files?.[0])}
              aria-describedby={describedBy('avatar', 'profile-avatar-help')}
            />
            <div id="profile-avatar-help" className="form-text">JPG, PNG, GIF or WebP, up to 2 MB.</div>
            {fieldError('avatar')}
            {(profile.avatar || avatarFile) && !removeAvatar && (
              <button
                type="button"
                className="btn btn-link btn-sm text-danger px-0"
                onClick={() => {
                  setAvatarFile(null)
                  resetFileInput()
                  setRemoveAvatar(!!profile.avatar)
                }}
              >
                {avatarFile ? 'Discard selected picture' : 'Remove current picture'}
              </button>
            )}
            {removeAvatar && (
              <div className="small text-muted">
                Picture will be removed when you save.{' '}
                <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => setRemoveAvatar(false)}>
                  Undo
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="profile-full-name" className="form-label">Full name</label>
            <input
              id="profile-full-name"
              type="text"
              className={fieldClass('full_name')}
              value={fullName}
              maxLength={255}
              autoComplete="name"
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={!!fieldErrors.full_name?.length}
              aria-describedby={describedBy('full_name')}
            />
            {fieldError('full_name')}
          </div>
          <div className="col-md-6">
            <label htmlFor="profile-username" className="form-label">
              Username <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              id="profile-username"
              type="text"
              className={fieldClass('username')}
              value={username}
              maxLength={150}
              required
              autoComplete="username"
              autoCapitalize="none"
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!fieldErrors.username?.length}
              aria-describedby={describedBy('username')}
            />
            {fieldError('username')}
          </div>
          <div className="col-12">
            <label htmlFor="profile-email" className="form-label">Email address</label>
            <input
              id="profile-email"
              type="email"
              className="form-control"
              value={profile.email}
              readOnly
              aria-describedby="profile-email-help"
            />
            <div id="profile-email-help" className="form-text">
              Changing your email requires your password — use “Change email” below.
            </div>
          </div>
          <div className="col-12">
            <label htmlFor="profile-bio" className="form-label">Bio</label>
            <textarea
              id="profile-bio"
              className={fieldClass('bio')}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              aria-invalid={!!fieldErrors.bio?.length}
              aria-describedby={describedBy('bio')}
            />
            {fieldError('bio')}
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-4">
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </fieldset>
    </form>
  )
}
