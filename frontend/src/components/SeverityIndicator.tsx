import { getSeverity } from '@/features/reports/meta'

/** Severity as a 4-step bar graphic plus a text label (never colour alone). */
export default function SeverityIndicator({ level, showSuffix = true }: { level: string; showSuffix?: boolean }) {
  const meta = getSeverity(level)
  return (
    <span className="ag-severity" data-level={level}>
      <span className="ag-severity-bars" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      {meta.label}
      {showSuffix ? ' severity' : ''}
    </span>
  )
}
