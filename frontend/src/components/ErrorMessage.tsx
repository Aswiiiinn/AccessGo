interface ErrorMessageProps {
  message: string
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="alert alert-danger" role="alert">
      {message}
    </div>
  )
}
