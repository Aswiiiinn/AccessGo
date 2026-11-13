import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '@/components/NavBar'
import BottomNav from '@/components/BottomNav'

/** Shared shell for public and user pages. The admin area uses AdminLayout. */
export default function MainLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)

  // On client-side navigation, start the new page at the top and move focus to it
  // so screen-reader and keyboard users land on the new content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <div className="ag-app">
      <a href="#main" className="ag-skip-link">Skip to main content</a>
      <Navbar />
      <main id="main" ref={mainRef} tabIndex={-1} className="ag-main" style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
