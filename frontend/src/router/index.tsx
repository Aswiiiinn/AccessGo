import { createBrowserRouter } from 'react-router-dom'

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: () => import('@/features/map/pages/MapPage'),
  },
  {
    path: '/login',
    lazy: () => import('@/features/auth/pages/LoginPage'),
  },
  {
    path: '/register',
    lazy: () => import('@/features/auth/pages/RegisterPage'),
  },
  {
    path: '/reports',
    lazy: () => import('@/features/reports/pages/ReportsPage'),
  },
  {
    path: '/profile',
    lazy: () => import('@/features/profile/pages/ProfilePage'),
  },
  {
    path: '/dashboard',
    lazy: () => import('@/features/dashboard/pages/DashboardPage'),
  },
])
