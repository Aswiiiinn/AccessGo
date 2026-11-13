import { LoaderCircle } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="d-flex justify-content-center align-items-center gap-2 p-4 text-muted" role="status">
      <LoaderCircle size={22} className="ag-spin" aria-hidden="true" />
      <span className="small">{label}</span>
    </div>
  )
}
