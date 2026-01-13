/**
 * Main App component for PostPhantom Web Dashboard
 * Handles routing and authentication state
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { AuthPage } from '@/pages/AuthPage'
import { SetupPage } from '@/pages/SetupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { VoiceVaultPage } from '@/pages/VoiceVaultPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PricingPage } from '@/pages/PricingPage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // If not authenticated, show auth page
  if (!isAuthenticated) {
    return <AuthPage />
  }

  // If authenticated, show main app with routing
  // The database error checking will happen inside individual components
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/voice-vault" element={<VoiceVaultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App