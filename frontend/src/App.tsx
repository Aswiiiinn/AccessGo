import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import MainLayout from '@/components/MainLayout'
import ProtectedRoute from '@/components/ProtectedRoute'

// Import pages
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ReportCreatePage from '@/pages/ReportCreatePage'
import ReportDetailPage from '@/pages/ReportDetailPage'
import MyReportsPage from '@/pages/MyReportsPage'
import LoadingSpinner from '@/components/LoadingSpinner'

// The moderator area (and its charting library) is loaded only when an admin opens it.
const AdminLayout = lazy(() => import('@/features/admin/AdminLayout'))
const AdminOverviewPage = lazy(() => import('@/features/admin/pages/AdminOverviewPage'))
const AdminReportsPage = lazy(() => import('@/features/admin/pages/AdminReportsPage'))
const AdminAnalyticsPage = lazy(() => import('@/features/admin/pages/AdminAnalyticsPage'))
const AdminDuplicatesPage = lazy(() => import('@/features/admin/pages/AdminDuplicatesPage'))
const AdminUsersPage = lazy(() => import('@/features/admin/pages/AdminUsersPage'))
import NotFoundPage from '@/pages/NotFoundPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import ProfilePage from '@/pages/ProfilePage'
import AccountSettingsPage from '@/pages/AccountSettingsPage'
import ChangePasswordPage from '@/pages/ChangePasswordPage'
import ExplorePage from '@/pages/ExplorePage'
import AccountHubPage from '@/pages/AccountHubPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/account" element={<AccountHubPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/reports/create" element={<ProtectedRoute><ReportCreatePage /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ReportDetailPage />} />
            <Route path="/my-reports" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/account/settings" element={<ProtectedRoute><AccountSettingsPage /></ProtectedRoute>} />
            <Route path="/account/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          {/* Moderator area has its own layout (sidebar on desktop, drawer on phones). */}
          <Route path="/admin" element={<Suspense fallback={<LoadingSpinner label="Loading admin…" />}><AdminLayout /></Suspense>}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="duplicates" element={<AdminDuplicatesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
