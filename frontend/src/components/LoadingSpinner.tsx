export default function LoadingSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center p-4">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}
