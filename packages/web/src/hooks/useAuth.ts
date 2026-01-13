/**
 * React hook for authentication state management
 * Provides reactive access to auth state throughout the app
 */

import { useState, useEffect } from 'react'
import { authService } from '@/lib/auth'
import type { AuthState } from '@postphantom/shared'

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState())

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((newAuthState) => {
      setAuthState(newAuthState)
    })

    return unsubscribe
  }, [])

  const isAuthenticated = authState.user !== null && authState.session !== null

  return {
    ...authState,
    signIn: authService.signInWithPassword.bind(authService),
    signUp: authService.signUp.bind(authService),
    signOut: authService.signOut.bind(authService),
    refreshSession: authService.refreshSession.bind(authService),
    isAuthenticated,
    getUserId: authService.getUserId.bind(authService),
    isSessionValid: authService.isSessionValid.bind(authService),
    getSupabaseClient: authService.getSupabaseClient.bind(authService),
  }
}