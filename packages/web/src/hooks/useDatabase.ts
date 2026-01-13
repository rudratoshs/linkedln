/**
 * React hooks for database operations
 * Provides reactive data access with loading states and error handling
 */

import { useState, useEffect } from 'react'
import { databaseService } from '@/lib/database'
import type { VoicePersona, UserPreferences } from '@/lib/database'

// Generic hook for async data fetching
function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchFn()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const runFetch = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchFn()
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    runFetch()

    return () => {
      cancelled = true
    }
  }, deps)

  return { data, loading, error, refetch: fetchData }
}

// Voice Personas hooks
export function useVoicePersonas() {
  return useAsyncData(() => databaseService.getVoicePersonas())
}

export function useCreateVoicePersona() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPersona = async (persona: Omit<VoicePersona, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await databaseService.createVoicePersona(persona)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create persona'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createPersona, loading, error }
}

export function useUpdateVoicePersona() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePersona = async (id: string, updates: Partial<VoicePersona>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await databaseService.updateVoicePersona(id, updates)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update persona'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updatePersona, loading, error }
}

export function useDeleteVoicePersona() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePersona = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await databaseService.deleteVoicePersona(id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete persona'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { deletePersona, loading, error }
}

// Request logs hooks
export function useRequestLogs(limit = 50, offset = 0) {
  return useAsyncData(() => databaseService.getRequestLogs(limit, offset), [limit, offset])
}

export function useRequestLogsSummary() {
  return useAsyncData(() => databaseService.getRequestLogsSummary())
}

// User preferences hooks
export function useUserPreferences() {
  return useAsyncData(() => databaseService.getUserPreferences())
}

export function useUpdateUserPreferences() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await databaseService.updateUserPreferences(preferences)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updatePreferences, loading, error }
}

// Rate limiting hooks
export function useRateLimit() {
  return useAsyncData(() => databaseService.getRateLimit())
}

// Usage analytics hooks
export function useUsageAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily', limit = 30) {
  return useAsyncData(() => databaseService.getUsageAnalytics(period, limit), [period, limit])
}

// Dashboard stats hook
export function useDashboardStats() {
  return useAsyncData(() => databaseService.getDashboardStats())
}

// Subscription and billing hooks
export function useSubscriptionPlan() {
  return useAsyncData(() => databaseService.getSubscriptionPlan())
}

export function useUpdateSubscriptionPlan() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updatePlan = async (plan: Partial<any>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await databaseService.updateSubscriptionPlan(plan)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subscription plan'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { updatePlan, loading, error }
}

export function useBillingGuard() {
  return useAsyncData(() => databaseService.getBillingGuard())
}