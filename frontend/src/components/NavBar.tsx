import { Link, NavLink } from 'react-router-dom'
import { isAuthenticated, clearTokens } from '@/lib/auth'

export default function NavBar() {
  const authenticated = isAuthenticated()

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">AccessGo</Link>
        <div className="navbar-nav ms-auto">
          <NavLink className="nav-link" to="/">Map</NavLink>
          <NavLink className="nav-link" to="/reports">Reports</NavLink>
          {authenticated ? (
            <>
              <NavLink className="nav-link" to="/profile">Profile</NavLink>
              <button className="btn btn-link nav-link" onClick={() => { clearTokens(); window.location.href = '/login' }}>
                Logout
              </button>
            </>
          ) : (
            <NavLink className="nav-link" to="/login">Login</NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
