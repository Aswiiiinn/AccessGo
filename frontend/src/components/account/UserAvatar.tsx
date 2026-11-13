import type { UserProfile } from '@/types'

export function getDisplayName(user: Pick<UserProfile, 'full_name' | 'username' | 'email'>): string {
  return user.full_name?.trim() || user.username || user.email
}

export function getInitials(user: Pick<UserProfile, 'full_name' | 'username' | 'email'>): string {
  const parts = getDisplayName(user).split(/[\s@._-]+/).filter(Boolean)
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return initials.toUpperCase()
}

interface UserAvatarProps {
  user: Pick<UserProfile, 'full_name' | 'username' | 'email' | 'avatar'>
  size?: number
  /** Overrides the stored avatar, e.g. a local preview of a newly selected file. */
  src?: string | null
}

/** Profile picture if the user has one, otherwise their initials. Decorative: callers label it. */
export default function UserAvatar({ user, size = 32, src }: UserAvatarProps) {
  const imageUrl = src ?? user.avatar
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) }
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="avatar-circle" style={style} />
  }
  return (
    <span className="avatar-circle" style={style} aria-hidden="true">
      {getInitials(user)}
    </span>
  )
}
