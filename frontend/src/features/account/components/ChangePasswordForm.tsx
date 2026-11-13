import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/features/auth/api'
import { useAuth } from '@/context/AuthContext'
import { parseApiError, type FieldErrors } from '@/lib/apiErrors'
import PasswordInput from '@/components/account/PasswordInput'
import PasswordRequirements from '@/components/account/PasswordRequirements'

/**
 * POST /auth/change-password/.
 *
 * On success the backend blacklists every refresh token for the account and returns
 * `reauthentication_required: true`, so we clear the local session and send the user
 * to /login. Password values only ever live in component state.
 */
export default function ChangePasswordForm() {
  const { logoutUser } = useAuth()
  const navigate = useNavigate()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: FieldErrors = {}
    if (!oldPassword) errs.old_password = ['Enter your current password.']
    if (!newPassword) errs.new_password = ['Enter a new password.']
    else if (newPassword.length < 8) errs.new_password = ['Password must contain at least 8 characters.']
    else if (newPassword === oldPassword) errs.new_password = ['New password must be different from your current password.']
    if (!confirmPassword) errs.re_new_password = ['Confirm your new password.']
    else if (newPassword !== confirmPassword) errs.re_new_password = ['Passwords do not match.']
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)
    try {
      const res = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        re_new_password: confirmPassword,
      })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (res.reauthentication_required) {
        setSuccess('Password changed. For your security, please log in again…')
        await logoutUser()
        navigate('/login', {
          replace: true,
          state: { message: 'Your password was changed. Please log in with your new password.' },
        })
      } else {
        setSuccess(res.detail || 'Password changed successfully.')
      }
    } catch (err) {
      const parsed = parseApiError(err, 'Could not change your password. Please try again.')
      setError(parsed.message)
      setFieldErrors(parsed.fieldErrors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {success && <div className="ag-notice ag-notice-success mb-3" role="status">{success}</div>}
      {error && <div className="ag-notice ag-notice-danger mb-3" role="alert">{error}</div>}
      <fieldset disabled={saving || !!success}>
        <PasswordInput
          label="Current password"
          value={oldPassword}
          onChange={setOldPassword}
          autoComplete="current-password"
          errors={fieldErrors.old_password}
          required
        />
        <PasswordInput
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          errors={fieldErrors.new_password}
          helpId="change-password-requirements"
          required
        />
        <PasswordRequirements password={newPassword} id="change-password-requirements" />
        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          errors={fieldErrors.re_new_password}
          required
        />
        <div className="ag-notice ag-notice-info mb-3">
          After changing your password you will be signed out on all devices and asked to log in again.
        </div>
        <button type="submit" className="btn btn-primary">
          {saving && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {saving ? 'Changing password…' : 'Change password'}
        </button>
      </fieldset>
    </form>
  )
}
