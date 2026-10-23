import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar'
import AppNavbar from './components/AppNavbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import AdminVerificationsPage from './pages/AdminVerificationsPage'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppContent() {
  const location = useLocation()
  const isAppRoute = 
    location.pathname.startsWith('/dashboard') || 
    location.pathname.startsWith('/profile') || 
    location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-[#080706] text-[#E5E0D8] selection:bg-[#D4AF37]/30 selection:text-white relative">
      {/* Background Arcane Grid Texture */}
      <div className="fixed inset-0 pointer-events-none arcane-grid-bg opacity-40 z-0" />

      {/* Main Content Layers */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {isAppRoute ? <AppNavbar /> : <Navbar />}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            
            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute>
                  <AdminVerificationsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>

      {/* Glossy Darkhold Toaster Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#14100E',
            color: '#F4EDE0',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#22C55E',
              secondary: '#080706',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#080706',
            },
            style: {
              background: '#200D0D',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#FCA5A5',
            },
          },
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
