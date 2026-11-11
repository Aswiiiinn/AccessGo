interface StatusBadgeProps {
  status: 'pending' | 'verified' | 'rejected' | 'resolved'
}

const statusMap: Record<StatusBadgeProps['status'], string> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
  resolved: 'secondary',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge bg-${statusMap[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
