import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { RequireAnonymous, RequireAuth, RequireRole, SessionRoot } from '@/app/guards'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PassengerLayout } from '@/layouts/PassengerLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { SplashScreen } from '@/features/splash/SplashScreen'
import { AuthPage } from '@/features/auth/AuthPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AccessDeniedPage } from '@/features/auth/AccessDeniedPage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'
import { RouteErrorPage } from '@/components/RouteErrorPage'

// Passenger pages — eagerly loaded (core flow)
import { DashboardPage } from '@/features/passenger/pages/DashboardPage'
import { JourneysPage } from '@/features/passenger/pages/JourneysPage'
import { JourneyDetailPage } from '@/features/passenger/pages/JourneyDetailPage'
import { TrainSearchPage } from '@/features/passenger/pages/TrainSearchPage'
import { TrainStatusPage } from '@/features/passenger/pages/TrainStatusPage'
import { DisruptionsPage } from '@/features/passenger/pages/DisruptionsPage'
import { DisruptionDetailPage } from '@/features/passenger/pages/DisruptionDetailPage'
import { RecoveryPage } from '@/features/passenger/pages/RecoveryPage'
import { NotificationsPage } from '@/features/passenger/pages/NotificationsPage'

// Secondary passenger pages — lazy (less frequent)
const HotelsPage = lazy(() => import('@/features/hotels/HotelsPage').then(m => ({ default: m.HotelsPage })))
const HotelDetailPage = lazy(() => import('@/features/hotels/HotelDetailPage').then(m => ({ default: m.HotelDetailPage })))
const HotelBookingDetailPage = lazy(() => import('@/features/hotels/HotelBookingDetailPage').then(m => ({ default: m.HotelBookingDetailPage })))
const ProfilePage = lazy(() => import('@/features/passenger/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const SettingsPage = lazy(() => import('@/features/passenger/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

// Admin pages — all lazy (separate bundle)
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const PassengersPage = lazy(() => import('@/features/admin/pages/PassengersPage').then(m => ({ default: m.PassengersPage })))
const JourneyRecordsPage = lazy(() => import('@/features/admin/pages/JourneyRecordsPage').then(m => ({ default: m.JourneyRecordsPage })))
const TrainsPage = lazy(() => import('@/features/admin/pages/TrainsPage').then(m => ({ default: m.TrainsPage })))
const AdminDisruptionsPage = lazy(() => import('@/features/admin/pages/AdminDisruptionsPage').then(m => ({ default: m.AdminDisruptionsPage })))
const RecommendationsPage = lazy(() => import('@/features/admin/pages/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })))
const AdminHotelsPage = lazy(() => import('@/features/admin/pages/AdminHotelsPage').then(m => ({ default: m.AdminHotelsPage })))
const AdminNotificationsPage = lazy(() => import('@/features/admin/pages/AdminNotificationsPage').then(m => ({ default: m.AdminNotificationsPage })))
const RolesPage = lazy(() => import('@/features/admin/pages/RolesPage').then(m => ({ default: m.RolesPage })))
const ReportsPage = lazy(() => import('@/features/admin/pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const AdminSettingsPage = lazy(() => import('@/features/admin/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })))
const AdminProfilePage = lazy(() => import('@/features/admin/pages/AdminProfilePage').then(m => ({ default: m.AdminProfilePage })))

function Loader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-label="Loading page">
      <div className="size-8 animate-spin rounded-full border-4 border-brand-navy border-t-transparent" />
    </div>
  )
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loader />}>{children}</Suspense>
}

export const appRoutes: RouteObject[] = [
  {
    element: <SessionRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <SplashScreen /> },
      {
        element: <RequireAnonymous />,
        children: [
          {
            path: '/auth',
            element: <AuthLayout />,
            children: [
              { index: true, element: <AuthPage /> },
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
              { path: 'reset-password', element: <ResetPasswordPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/access-denied', element: <AccessDeniedPage /> },
          {
            element: <RequireRole role="PASSENGER" />,
            children: [
              {
                path: '/app',
                element: <PassengerLayout />,
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, element: <Navigate to="/app/dashboard" replace /> },
                  { path: 'dashboard', element: <DashboardPage /> },
                  { path: 'journeys', element: <JourneysPage /> },
                  { path: 'journeys/:id', element: <JourneyDetailPage /> },
                  { path: 'search', element: <TrainSearchPage /> },
                  { path: 'status', element: <TrainStatusPage /> },
                  { path: 'disruptions', element: <DisruptionsPage /> },
                  { path: 'disruptions/:id', element: <DisruptionDetailPage /> },
                  { path: 'recovery', element: <RecoveryPage /> },
                  { path: 'hotels', element: <S><HotelsPage /></S> },
                  { path: 'hotels/:id', element: <S><HotelDetailPage /></S> },
                  { path: 'hotels/bookings/:id', element: <S><HotelBookingDetailPage /></S> },
                  { path: 'notifications', element: <NotificationsPage /> },
                  { path: 'profile', element: <S><ProfilePage /></S> },
                  { path: 'settings', element: <S><SettingsPage /></S> },
                ],
              },
            ],
          },
          {
            element: <RequireRole role="ADMIN" />,
            children: [
              {
                path: '/admin',
                element: <AdminLayout />,
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, element: <Navigate to="/admin/dashboard" replace /> },
                  { path: 'dashboard', element: <S><AdminDashboardPage /></S> },
                  { path: 'passengers', element: <S><PassengersPage /></S> },
                  { path: 'journeys', element: <S><JourneyRecordsPage /></S> },
                  { path: 'trains', element: <S><TrainsPage /></S> },
                  { path: 'disruptions', element: <S><AdminDisruptionsPage /></S> },
                  { path: 'recommendations', element: <S><RecommendationsPage /></S> },
                  { path: 'hotels', element: <S><AdminHotelsPage /></S> },
                  { path: 'notifications', element: <S><AdminNotificationsPage /></S> },
                  { path: 'roles', element: <S><RolesPage /></S> },
                  { path: 'reports', element: <S><ReportsPage /></S> },
                  { path: 'settings', element: <S><AdminSettingsPage /></S> },
                  { path: 'profile', element: <S><AdminProfilePage /></S> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(appRoutes)
