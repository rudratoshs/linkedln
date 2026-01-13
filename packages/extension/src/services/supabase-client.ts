import { createClient } from '@supabase/supabase-js'

// Simple storage adapter interface for now
interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// Chrome Storage Adapter implementation
class ChromeStorageAdapter implements StorageAdapter {
  private readonly keyPrefix = 'postphantom_auth_'

  async getItem(key: string): Promise<string | null> {
    try {
      // Check if chrome extension context is still valid
      if (!chrome?.storage?.local) {
        console.warn('ChromeStorageAdapter: Extension context invalidated')
        return null
      }
      
      const prefixedKey = this.keyPrefix + key
      const result = await chrome.storage.local.get([prefixedKey])
      return result[prefixedKey] || null
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to get item', { key, error })
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Check if chrome extension context is still valid
      if (!chrome?.storage?.local) {
        console.warn('ChromeStorageAdapter: Extension context invalidated, cannot set item')
        return
      }
      
      const prefixedKey = this.keyPrefix + key
      await chrome.storage.local.set({ [prefixedKey]: value })
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to set item', { key, error })
      // Don't throw error to prevent breaking the app
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      // Check if chrome extension context is still valid
      if (!chrome?.storage?.local) {
        console.warn('ChromeStorageAdapter: Extension context invalidated, cannot remove item')
        return
      }
      
      const prefixedKey = this.keyPrefix + key
      await chrome.storage.local.remove([prefixedKey])
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to remove item', { key, error })
      // Don't throw error to prevent breaking the app
    }
  }
}

// These will be configured via environment variables or extension options
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// Create Supabase client with Chrome storage adapter for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: new ChromeStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export type { User } from '@supabase/supabase-js'