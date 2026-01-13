/**
 * Prohibited Actions Prevention Service for PostPhantom
 * Prevents automatic likes, bulk actions, and data scraping
 * Requirement: 6.4
 */

export interface ProhibitedAction {
  type: 'automatic_like' | 'bulk_action' | 'data_scraping' | 'unauthorized_interaction'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ActionValidationResult {
  allowed: boolean
  prohibitedAction?: ProhibitedAction
  reason?: string
}

export class ProhibitedActionsService {
  private readonly prohibitedPatterns = {
    // LinkedIn DOM selectors that should never be automatically clicked
    automaticLikeSelectors: [
      '[data-control-name="like"]',
      '[data-control-name="reactions-menu-trigger"]',
      '.react-button',
      '.like-button',
      '[aria-label*="like"]',
      '[aria-label*="Like"]'
    ],
    
    // Bulk action indicators
    bulkActionSelectors: [
      '[data-control-name="bulk"]',
      '.bulk-action',
      '[data-control-name="select-all"]',
      '.select-all-checkbox',
      '[data-control-name="mass-action"]'
    ],
    
    // Data export/scraping selectors
    dataScrapingSelectors: [
      '[data-control-name="export"]',
      '[data-control-name="download"]',
      '.export-button',
      '.download-button',
      '[href*="export"]',
      '[href*="download"]'
    ],
    
    // Connection request automation
    connectionAutomationSelectors: [
      '[data-control-name="connect"]',
      '.connect-button',
      '[data-control-name="invite"]',
      '.invite-button'
    ]
  }

  /**
   * Validate if an action is allowed
   * Requirement 6.4: Block automatic likes, bulk actions, and data scraping
   */
  validateAction(actionType: string, targetElement?: Element | string): ActionValidationResult {
    // Check for automatic likes
    if (this.isAutomaticLike(actionType, targetElement)) {
      return {
        allowed: false,
        prohibitedAction: {
          type: 'automatic_like',
          description: 'Automatic liking is prohibited to maintain authentic engagement',
          severity: 'high'
        },
        reason: 'PostPhantom does not support automatic likes to ensure authentic professional engagement'
      }
    }

    // Check for bulk actions
    if (this.isBulkAction(actionType, targetElement)) {
      return {
        allowed: false,
        prohibitedAction: {
          type: 'bulk_action',
          description: 'Bulk actions are prohibited to prevent spam-like behavior',
          severity: 'critical'
        },
        reason: 'Bulk actions are not supported to maintain LinkedIn platform integrity and prevent spam-like behavior'
      }
    }

    // Check for data scraping
    if (this.isDataScraping(actionType, targetElement)) {
      return {
        allowed: false,
        prohibitedAction: {
          type: 'data_scraping',
          description: 'Data export/scraping is prohibited to respect user privacy',
          severity: 'critical'
        },
        reason: 'Data scraping violates LinkedIn Terms of Service and user privacy'
      }
    }

    // Check for unauthorized interactions
    if (this.isUnauthorizedInteraction(actionType, targetElement)) {
      return {
        allowed: false,
        prohibitedAction: {
          type: 'unauthorized_interaction',
          description: 'Unauthorized LinkedIn interactions are prohibited',
          severity: 'medium'
        },
        reason: 'This interaction is not supported by PostPhantom'
      }
    }

    return { allowed: true }
  }

  /**
   * Validate DOM element interaction
   */
  validateElementInteraction(element: Element): ActionValidationResult {
    const selector = this.getElementSelector(element)
    
    // Map pattern keys to action types
    const actionTypeMap: Record<string, string> = {
      'automaticLikeSelectors': 'automatic_like',
      'bulkActionSelectors': 'bulk_action', 
      'dataScrapingSelectors': 'data_scraping',
      'connectionAutomationSelectors': 'unauthorized_interaction'
    }
    
    // Check against all prohibited patterns
    for (const [patternKey, selectors] of Object.entries(this.prohibitedPatterns)) {
      for (const prohibitedSelector of selectors) {
        if (element.matches(prohibitedSelector)) {
          const actionType = actionTypeMap[patternKey]
          if (actionType === 'automatic_like') {
            return {
              allowed: false,
              prohibitedAction: {
                type: 'automatic_like',
                description: 'Automatic liking is prohibited to maintain authentic engagement',
                severity: 'high'
              },
              reason: 'PostPhantom does not support automatic likes to ensure authentic professional engagement'
            }
          } else if (actionType === 'bulk_action') {
            return {
              allowed: false,
              prohibitedAction: {
                type: 'bulk_action',
                description: 'Bulk actions are prohibited to prevent spam-like behavior',
                severity: 'critical'
              },
              reason: 'Bulk actions are not supported to maintain LinkedIn platform integrity and prevent spam-like behavior'
            }
          } else if (actionType === 'data_scraping') {
            return {
              allowed: false,
              prohibitedAction: {
                type: 'data_scraping',
                description: 'Data export/scraping is prohibited to respect user privacy',
                severity: 'critical'
              },
              reason: 'Data scraping violates LinkedIn Terms of Service and user privacy'
            }
          } else if (actionType === 'unauthorized_interaction') {
            return {
              allowed: false,
              prohibitedAction: {
                type: 'unauthorized_interaction',
                description: 'Unauthorized LinkedIn interactions are prohibited',
                severity: 'medium'
              },
              reason: 'This interaction is not supported by PostPhantom'
            }
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check if an action involves automatic liking
   */
  private isAutomaticLike(actionType: string, target?: Element | string): boolean {
    if (actionType.toLowerCase().includes('like') || actionType.toLowerCase().includes('react')) {
      return true
    }

    if (typeof target === 'string') {
      return this.prohibitedPatterns.automaticLikeSelectors.some(selector => 
        target.includes(selector.replace(/[\[\]"']/g, ''))
      )
    }

    if (target && typeof Element !== 'undefined' && target instanceof Element) {
      return this.prohibitedPatterns.automaticLikeSelectors.some(selector => 
        target.matches(selector)
      )
    }

    return false
  }

  /**
   * Check if an action involves bulk operations
   */
  private isBulkAction(actionType: string, target?: Element | string): boolean {
    const bulkKeywords = ['bulk', 'mass', 'batch', 'multiple', 'all', 'select-all']
    
    if (bulkKeywords.some(keyword => actionType.toLowerCase().includes(keyword))) {
      return true
    }

    if (typeof target === 'string') {
      return this.prohibitedPatterns.bulkActionSelectors.some(selector => 
        target.includes(selector.replace(/[\[\]"']/g, ''))
      )
    }

    if (target && typeof Element !== 'undefined' && target instanceof Element) {
      return this.prohibitedPatterns.bulkActionSelectors.some(selector => 
        target.matches(selector)
      )
    }

    return false
  }

  /**
   * Check if an action involves data scraping
   */
  private isDataScraping(actionType: string, target?: Element | string): boolean {
    const scrapingKeywords = ['export', 'download', 'scrape', 'extract', 'harvest', 'collect']
    
    if (scrapingKeywords.some(keyword => actionType.toLowerCase().includes(keyword))) {
      return true
    }

    if (typeof target === 'string') {
      return this.prohibitedPatterns.dataScrapingSelectors.some(selector => 
        target.includes(selector.replace(/[\[\]"']/g, ''))
      )
    }

    if (target && typeof Element !== 'undefined' && target instanceof Element) {
      return this.prohibitedPatterns.dataScrapingSelectors.some(selector => 
        target.matches(selector)
      )
    }

    return false
  }

  /**
   * Check if an action involves unauthorized interactions
   */
  private isUnauthorizedInteraction(actionType: string, target?: Element | string): boolean {
    const unauthorizedKeywords = ['connect', 'invite', 'follow', 'unfollow', 'block', 'report']
    
    if (unauthorizedKeywords.some(keyword => actionType.toLowerCase().includes(keyword))) {
      return true
    }

    if (target && typeof Element !== 'undefined' && target instanceof Element) {
      return this.prohibitedPatterns.connectionAutomationSelectors.some(selector => 
        target.matches(selector)
      )
    }

    return false
  }

  /**
   * Get a CSS selector string for an element
   */
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`
    }
    
    if (element.className) {
      return `.${element.className.split(' ').join('.')}`
    }
    
    return element.tagName.toLowerCase()
  }

  /**
   * Log prohibited action attempt for monitoring
   */
  logProhibitedAction(userId: string, action: ProhibitedAction, context?: any): void {
    console.warn('Prohibited action attempted:', {
      userId,
      action,
      context,
      timestamp: new Date().toISOString()
    })
    
    // In a real implementation, this would send to monitoring/analytics
    // For now, we just log to console for debugging
  }

  /**
   * Get list of all prohibited action types
   */
  getProhibitedActionTypes(): string[] {
    return [
      'automatic_like',
      'bulk_action', 
      'data_scraping',
      'unauthorized_interaction'
    ]
  }

  /**
   * Check if PostPhantom should intercept a specific DOM event
   */
  shouldInterceptEvent(event: Event): boolean {
    if (!event.target || (typeof Element !== 'undefined' && !(event.target instanceof Element))) {
      return false
    }

    const validation = this.validateElementInteraction(event.target)
    return !validation.allowed
  }
}

// Helper function to create prohibited actions service instance
export function createProhibitedActionsService(): ProhibitedActionsService {
  return new ProhibitedActionsService()
}