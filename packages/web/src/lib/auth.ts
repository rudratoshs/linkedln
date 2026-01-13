/**
 * Authentication configuration for PostPhantom Web Dashboard
 * Reuses the shared auth service with web-specific storage adapter
 */

import { AuthService, createAuthService } from '@postphantom/shared'

// Web storage adapter for browser localStorage
class WebStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key)
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value)
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key)
  }

  async clearAuthData(): Promise<void> {
    // Clear all Supabase auth-related keys
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    )
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

// Environment configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create auth service instance
export const authService = createAuthService({
  supabaseUrl,
  supabaseAnonKey,
  storageAdapter: new WebStorageAdapter()
})

// Export auth service for use throughout the app
export { AuthService }
export type { AuthState, AuthStateChangeCallback } from '@postphantom/shared'