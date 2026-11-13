/**
 * Mirrors the backend's AUTH_PASSWORD_VALIDATORS (config/settings/base.py) as guidance.
 * Only the length rule can be checked locally; the server is the source of truth and
 * its messages are shown if a password is rejected.
 */
export default function PasswordRequirements({ password, id }: { password: string; id: string }) {
  const longEnough = password.length >= 8
  const notAllNumeric = password.length > 0 && !/^\d+$/.test(password)
  return (
    <div id={id} className="small text-muted mb-3">
      <div className="mb-1">Your new password must:</div>
      <ul className="password-requirements ps-3 mb-0">
        <li className={longEnough ? 'text-success' : undefined}>
          contain at least 8 characters{longEnough ? ' ✓' : ''}
        </li>
        <li className={notAllNumeric ? 'text-success' : undefined}>
          not be entirely numeric{notAllNumeric ? ' ✓' : ''}
        </li>
        <li>not be a commonly used password</li>
        <li>not be too similar to your name, username or email</li>
      </ul>
    </div>
  )
}
