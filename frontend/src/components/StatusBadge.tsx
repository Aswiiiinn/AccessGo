import { Sparkles, CircleCheck, CircleX, CircleDot } from 'lucide-react'
import type { ReportStatus } from '@/types'
import { getStatus } from '@/features/reports/meta'

// Duplicate-detection statuses share the badge styling.
const DUPLICATE_STATUS: Record<string, { label: string; tone: string; icon: typeof CircleDot }> = {
  suggested: { label: 'Suggested', tone: 'info', icon: Sparkles },
  confirmed: { label: 'Confirmed duplicate', tone: 'danger', icon: CircleCheck },
  dismissed: { label: 'Not a duplicate', tone: 'neutral', icon: CircleX },
}

/** Report status with icon + text, so status never relies on colour alone. */
export default function StatusBadge({ status, title }: { status: ReportStatus | string; title?: string }) {
  const dup = DUPLICATE_STATUS[status]
  if (dup) {
    const Icon = dup.icon
    return (
      <span className={`ag-badge ag-badge-${dup.tone}`} title={title}>
        <Icon size={13} aria-hidden="true" />
        {dup.label}
      </span>
    )
  }
  const meta = getStatus(status)
  const Icon = meta.icon
  return (
    <span className={`ag-badge ag-badge-${meta.tone}`} title={title ?? meta.description}>
      <Icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
