import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Navbar from './layouts/Navbar'
import ProtectedRoute from './layouts/ProtectedRoute'

// Public pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Passenger pages
import SearchPage from './pages/passenger/SearchPage'
import BookPage from './pages/passenger/BookPage'
import BookingsPage from './pages/passenger/BookingsPage'
import HotelsPage from './pages/passenger/HotelsPage'
import CabsPage from './pages/passenger/CabsPage'
import AlertsPage from './pages/passenger/AlertsPage'
import NotificationsPage from './pages/NotificationsPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTrains from './pages/admin/AdminTrains'
import AdminDisruptions from './pages/admin/AdminDisruptions'
import AdminBookings from './pages/admin/AdminBookings'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected - All authenticated */}
          <Route path="/" element={
            <Layout>
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            </Layout>
          } />

          {/* Passenger routes */}
          <Route path="/search" element={
            <Layout>
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/book/:trainId" element={
            <Layout>
              <ProtectedRoute>
                <BookPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/bookings" element={
            <Layout>
              <ProtectedRoute>
                <BookingsPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/hotels" element={
            <Layout>
              <ProtectedRoute>
                <HotelsPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/cabs" element={
            <Layout>
              <ProtectedRoute>
                <CabsPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/alerts" element={
            <Layout>
              <ProtectedRoute>
                <AlertsPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/notifications" element={
            <Layout>
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            </Layout>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <Layout>
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/admin/trains" element={
            <Layout>
              <ProtectedRoute adminOnly>
                <AdminTrains />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/admin/disruptions" element={
            <Layout>
              <ProtectedRoute adminOnly>
                <AdminDisruptions />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/admin/bookings" element={
            <Layout>
              <ProtectedRoute adminOnly>
                <AdminBookings />
              </ProtectedRoute>
            </Layout>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
