import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  icon?: ReactNode
}

/** A button that shows a spinner and blocks repeat clicks while `loading`. */
export default function LoadingButton({ loading = false, loadingText, icon, children, disabled, type = 'button', ...rest }: LoadingButtonProps) {
  return (
    <button {...rest} type={type} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <LoaderCircle size={18} className="ag-spin" aria-hidden="true" /> : icon}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  )
}
