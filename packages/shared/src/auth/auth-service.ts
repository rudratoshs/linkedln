/**
 * Authentication service for PostPhantom
 * Handles Supabase authentication with Chrome extension support
 */

import { createClient, SupabaseClient, User, Session, AuthError } from '@supabase/supabase-js'
import { createStorageAdapter, StorageAdapter } from './chrome-storage-adapter.js'

export interface AuthConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  storageAdapter?: StorageAdapter
}

export interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: AuthError | null
}

export type AuthStateChangeCallback = (authState: AuthState) => void

/**
 * Authentication service that provides secure user authentication
 * with Chrome extension support and session management
 */
export class AuthService {
  private supabase: SupabaseClient
  private storageAdapter: StorageAdapter
  private authState: AuthState
  private listeners: Set<AuthStateChangeCallback> = new Set()

  constructor(config: AuthConfig) {
    this.storageAdapter = config.storageAdapter || createStorageAdapter()
    
    // Create Supabase client with custom storage adapter
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: this.storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false // Disable for Chrome extension
      }
    })

    // Initialize auth state
    this.authState = {
      user: null,
      session: null,
      isLoading: true,
      error: null
    }

    // Set up auth state change listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(event, session)
    })

    // Initialize session
    this.initializeSession()
  }

  /**
   * Get the current authentication state
   */
  getAuthState(): AuthState {
    return { ...this.authState }
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.authState.user
  }

  /**
   * Get the current session
   */
  getCurrentSession(): Session | null {
    return this.authState.session
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.user !== null && this.authState.session !== null
  }

  /**
   * Get the Supabase client instance
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabase
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<{
    user: User | null
    session: Session | null
    error: AuthError | null
  }> {
    try {
      this.updateAuthState({ isLoading: true, error: null })
      
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        this.updateAuthState({ error, isLoading: false })
        return { user: null, session: null, error }
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      const authError = error as AuthError
      this.updateAuthState({ error: authError, isLoading: false })
      return { user: null, session: null, error: authError }
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<{
    user: User | null
    session: Session | null
    error: AuthError | null
  }> {
    try {
      this.updateAuthState({ isLoading: true, error: null })
      
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        this.updateAuthState({ error, isLoading: false })
        return { user: null, session: null, error }
      }

      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      const authError = error as AuthError
      this.updateAuthState({ error: authError, isLoading: false })
      return { user: null, session: null, error: authError }
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      this.updateAuthState({ isLoading: true, error: null })
      
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        this.updateAuthState({ error, isLoading: false })
        return { error }
      }

      // Clear all auth data from storage
      await this.storageAdapter.clearAuthData()
      
      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      this.updateAuthState({ error: authError, isLoading: false })
      return { error: authError }
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<{
    session: Session | null
    error: AuthError | null
  }> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        this.updateAuthState({ error })
        return { session: null, error }
      }

      return { session: data.session, error: null }
    } catch (error) {
      const authError = error as AuthError
      this.updateAuthState({ error: authError })
      return { session: null, error: authError }
    }
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    this.listeners.add(callback)
    
    // Immediately call with current state
    callback(this.getAuthState())
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Get user ID if authenticated
   */
  getUserId(): string | null {
    return this.authState.user?.id || null
  }

  /**
   * Check if the current session is valid and not expired
   */
  isSessionValid(): boolean {
    const session = this.authState.session
    if (!session) return false
    
    const now = Math.floor(Date.now() / 1000)
    return session.expires_at ? session.expires_at > now : true
  }

  /**
   * Initialize session from storage
   */
  private async initializeSession(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('Failed to initialize session:', error)
        this.updateAuthState({ error, isLoading: false })
        return
      }

      this.updateAuthState({
        user: data.session?.user || null,
        session: data.session,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Failed to initialize session:', error)
      this.updateAuthState({
        error: error as AuthError,
        isLoading: false
      })
    }
  }

  /**
   * Handle authentication state changes from Supabase
   */
  private handleAuthStateChange(event: string, session: Session | null): void {
    console.log('Auth state change:', event, session?.user?.id)
    
    this.updateAuthState({
      user: session?.user || null,
      session,
      isLoading: false,
      error: null
    })
  }

  /**
   * Update authentication state and notify listeners
   */
  private updateAuthState(updates: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...updates }
    
    // Notify all listeners
    this.listeners.forEach(callback => {
      try {
        callback(this.getAuthState())
      } catch (error) {
        console.error('Error in auth state change callback:', error)
      }
    })
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.listeners.clear()
  }
}

/**
 * Factory function to create AuthService instance
 */
export function createAuthService(config: AuthConfig): AuthService {
  return new AuthService(config)
}