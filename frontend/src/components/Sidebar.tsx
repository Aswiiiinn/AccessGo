export default function Sidebar() {
  return (
    <aside className="sidebar bg-light">
      <div className="p-3">
        <h5 className="mb-3">Admin Dashboard</h5>
        <nav className="nav flex-column">
          <a className="nav-link" href="#overview">
            Overview
          </a>
          <a className="nav-link" href="#reports">
            Report Management
          </a>
          <a className="nav-link" href="#analytics">
            Analytics
          </a>
          <a className="nav-link" href="#duplicates">
            Potential Duplicates
          </a>
          <a className="nav-link" href="#ai">
            AI Classification Review
          </a>
          <a className="nav-link" href="#users">
            User Management
          </a>
        </nav>
      </div>
    </aside>
  )
}