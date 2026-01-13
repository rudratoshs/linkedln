/**
 * Chrome Storage Adapter for Supabase Auth
 * Provides secure storage for authentication tokens in Chrome extension
 */

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * Chrome Storage Adapter that uses chrome.storage.local for secure token storage
 * This adapter ensures authentication tokens are stored securely in the extension
 */
export class ChromeStorageAdapter implements StorageAdapter {
  private readonly keyPrefix = 'postphantom_auth_'

  constructor() {
    // Verify chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API is not available. This adapter can only be used in Chrome extensions.')
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
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
      const prefixedKey = this.keyPrefix + key
      await chrome.storage.local.set({ [prefixedKey]: value })
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to set item', { key, error })
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const prefixedKey = this.keyPrefix + key
      await chrome.storage.local.remove([prefixedKey])
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to remove item', { key, error })
      throw error
    }
  }

  /**
   * Clear all authentication-related data from storage
   * Useful for logout or reset operations
   */
  async clearAuthData(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get(null)
      const authKeys = Object.keys(allData).filter(key => key.startsWith(this.keyPrefix))
      
      if (authKeys.length > 0) {
        await chrome.storage.local.remove(authKeys)
      }
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to clear auth data', error)
      throw error
    }
  }

  /**
   * Get all stored authentication keys (for debugging)
   */
  async getStoredKeys(): Promise<string[]> {
    try {
      const allData = await chrome.storage.local.get(null)
      return Object.keys(allData)
        .filter(key => key.startsWith(this.keyPrefix))
        .map(key => key.replace(this.keyPrefix, ''))
    } catch (error) {
      console.error('ChromeStorageAdapter: Failed to get stored keys', error)
      return []
    }
  }
}

/**
 * Fallback storage adapter for non-Chrome environments (testing, development)
 * Uses localStorage as a fallback mechanism
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly keyPrefix = 'postphantom_auth_'

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.keyPrefix + key)
    } catch (error) {
      console.error('LocalStorageAdapter: Failed to get item', { key, error })
      return null
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.keyPrefix + key, value)
    } catch (error) {
      console.error('LocalStorageAdapter: Failed to set item', { key, error })
      throw error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.keyPrefix + key)
    } catch (error) {
      console.error('LocalStorageAdapter: Failed to remove item', { key, error })
      throw error
    }
  }

  async clearAuthData(): Promise<void> {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.keyPrefix)) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error('LocalStorageAdapter: Failed to clear auth data', error)
      throw error
    }
  }
}

/**
 * Factory function to create the appropriate storage adapter
 * Returns ChromeStorageAdapter in Chrome extension context, LocalStorageAdapter otherwise
 */
export function createStorageAdapter(): StorageAdapter {
  try {
    // Check if we're in a Chrome extension environment
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new ChromeStorageAdapter()
    }
  } catch (error) {
    console.warn('Chrome storage not available, falling back to localStorage', error)
  }
  
  // Fallback to localStorage for development/testing
  return new LocalStorageAdapter()
}