export default function Footer() {
  return (
    <footer className="bg-light py-4 mt-auto">
      <div className="container text-center">
        <small className="text-muted">
          AccessGo &copy; {new Date().getFullYear()} - Community-powered accessibility reporting
        </small>
      </div>
    </footer>
  )
}