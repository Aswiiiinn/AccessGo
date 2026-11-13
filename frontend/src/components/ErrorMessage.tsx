import Notice from '@/components/ui/Notice'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  title?: string
}

export default function ErrorMessage({ message, onRetry, title }: ErrorMessageProps) {
  return (
    <Notice
      tone="danger"
      title={title}
      className="mb-3"
      action={
        onRetry ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onRetry}>
            Try again
          </button>
        ) : undefined
      }
    >
      {message}
    </Notice>
  )
}
