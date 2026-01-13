/**
 * Session management utilities for PostPhantom
 * Handles user session lifecycle and validation
 */

import { AuthService } from './auth-service.js'
import { DatabaseService } from '../database/database-service.js'
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../types/database.js'

export interface SessionInfo {
  userId: string
  email: string
  isAuthenticated: boolean
  sessionValid: boolean
  preferences: UserPreferences
  lastActivity: Date
}

/**
 * Session manager that coordinates authentication and user data
 */
export class SessionManager {
  private authService: AuthService
  private databaseService: DatabaseService
  private sessionInfo: SessionInfo | null = null
  private activityTimer: NodeJS.Timeout | null = null

  constructor(authService: AuthService, databaseService: DatabaseService) {
    this.authService = authService
    this.databaseService = databaseService

    // Listen for auth state changes
    this.authService.onAuthStateChange(async (authState) => {
      if (authState.user && authState.session) {
        await this.initializeSession(authState.user.id, authState.user.email || '')
      } else {
        this.clearSession()
      }
    })
  }

  /**
   * Get current session information
   */
  getSessionInfo(): SessionInfo | null {
    return this.sessionInfo ? { ...this.sessionInfo } : null
  }

  /**
   * Check if user is authenticated and session is valid
   */
  isAuthenticated(): boolean {
    return this.sessionInfo?.isAuthenticated && this.sessionInfo?.sessionValid || false
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.sessionInfo?.userId || null
  }

  /**
   * Get user preferences
   */
  getUserPreferences(): UserPreferences | null {
    return this.sessionInfo?.preferences || null
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    if (!this.sessionInfo?.userId) {
      throw new Error('No authenticated user')
    }

    const updatedPreferences = await this.databaseService.updateUserPreferences(
      this.sessionInfo.userId,
      updates
    )

    // Update session info
    if (this.sessionInfo) {
      this.sessionInfo.preferences = updatedPreferences
    }

    return updatedPreferences
  }

  /**
   * Record user activity to update last activity timestamp
   */
  recordActivity(): void {
    if (this.sessionInfo) {
      this.sessionInfo.lastActivity = new Date()
    }

    // Reset activity timer
    if (this.activityTimer) {
      clearTimeout(this.activityTimer)
    }

    // Set up auto-logout after 24 hours of inactivity
    this.activityTimer = setTimeout(() => {
      this.handleInactivityTimeout()
    }, 24 * 60 * 60 * 1000) // 24 hours
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    if (!this.sessionInfo) {
      return false
    }

    // Check if auth session is still valid
    const isSessionValid = this.authService.isSessionValid()
    
    if (!isSessionValid) {
      // Try to refresh the session
      const { session, error } = await this.authService.refreshSession()
      
      if (error || !session) {
        this.clearSession()
        return false
      }
    }

    // Update session validity
    if (this.sessionInfo) {
      this.sessionInfo.sessionValid = true
    }

    return true
  }

  /**
   * Sign out and clear session
   */
  async signOut(): Promise<void> {
    await this.authService.signOut()
    this.clearSession()
  }

  /**
   * Initialize session for authenticated user
   */
  private async initializeSession(userId: string, email: string): Promise<void> {
    try {
      // Get or create user preferences
      const preferences = await this.databaseService.getUserPreferences(userId)

      this.sessionInfo = {
        userId,
        email,
        isAuthenticated: true,
        sessionValid: this.authService.isSessionValid(),
        preferences,
        lastActivity: new Date()
      }

      // Start activity tracking
      this.recordActivity()

      console.log('Session initialized for user:', userId)
    } catch (error) {
      console.error('Failed to initialize session:', error)
      this.clearSession()
    }
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    this.sessionInfo = null
    
    if (this.activityTimer) {
      clearTimeout(this.activityTimer)
      this.activityTimer = null
    }

    console.log('Session cleared')
  }

  /**
   * Handle inactivity timeout
   */
  private async handleInactivityTimeout(): Promise<void> {
    console.log('Session expired due to inactivity')
    await this.signOut()
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration(): number {
    if (!this.sessionInfo?.lastActivity) {
      return 0
    }

    return Date.now() - this.sessionInfo.lastActivity.getTime()
  }

  /**
   * Check if session is about to expire (within 1 hour)
   */
  isSessionExpiringSoon(): boolean {
    const session = this.authService.getCurrentSession()
    if (!session?.expires_at) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const oneHour = 60 * 60 // 1 hour in seconds
    
    return session.expires_at - now < oneHour
  }

  /**
   * Refresh session if it's expiring soon
   */
  async refreshIfNeeded(): Promise<boolean> {
    if (this.isSessionExpiringSoon()) {
      const { session, error } = await this.authService.refreshSession()
      
      if (error || !session) {
        console.error('Failed to refresh session:', error)
        return false
      }

      console.log('Session refreshed successfully')
      return true
    }

    return true // No refresh needed
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer)
      this.activityTimer = null
    }
    
    this.clearSession()
  }
}

/**
 * Factory function to create SessionManager instance
 */
export function createSessionManager(
  authService: AuthService,
  databaseService: DatabaseService
): SessionManager {
  return new SessionManager(authService, databaseService)
}