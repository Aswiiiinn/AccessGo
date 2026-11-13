import type { CSSProperties } from 'react'

export function Skeleton({ width = '100%', height = 14, style, className = '' }: { width?: number | string; height?: number | string; style?: CSSProperties; className?: string }) {
  return <span className={`ag-skeleton ${className}`} style={{ width, height, ...style }} aria-hidden="true" />
}

/** Placeholder list matching the report card layout while data loads. */
export function ReportListSkeleton({ count = 3, label = 'Loading reports' }: { count?: number; label?: string }) {
  return (
    <div className="ag-list" role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ag-card ag-report-item">
          <Skeleton width="65%" height={18} />
          <div className="d-flex gap-2">
            <Skeleton width={84} height={22} style={{ borderRadius: 999 }} />
            <Skeleton width={96} height={22} style={{ borderRadius: 999 }} />
          </div>
          <Skeleton width="90%" />
        </div>
      ))}
      <span className="visually-hidden">{label}…</span>
    </div>
  )
}
