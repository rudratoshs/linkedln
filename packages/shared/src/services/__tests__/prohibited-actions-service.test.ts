/**
 * Property tests for Prohibited Actions Service
 * Property 16: Prohibited Action Prevention
 * Validates: Requirements 6.4
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { ProhibitedActionsService } from '../prohibited-actions-service.js'

// Mock DOM environment for testing
const mockElement = (selector: string, tagName: string = 'button'): Element => {
  const element = {
    tagName: tagName.toUpperCase(),
    matches: vi.fn((sel: string) => {
      // Exact match for the selector we're testing
      if (sel === selector) {
        return true
      }
      
      // Handle CSS class selectors like .like-button
      if (sel.startsWith('.')) {
        const className = sel.substring(1)
        return selector.includes(className)
      }
      
      // Handle data-control-name selectors like [data-control-name="like"]
      if (sel.includes('data-control-name=')) {
        const match = sel.match(/data-control-name="([^"]+)"/)
        if (match) {
          const controlName = match[1]
          return selector.includes(`data-control-name="${controlName}"`)
        }
      }
      
      // Handle aria-label selectors - only match if selector actually contains aria-label
      if (sel.includes('aria-label')) {
        if (!selector.includes('aria-label')) {
          return false
        }
        const ariaLabel = sel.match(/aria-label[*=]?"([^"]+)"/)?.[1]
        return selector.includes(ariaLabel || '')
      }
      
      // Handle href selectors - only match if selector actually contains href
      if (sel.includes('href*=')) {
        if (!selector.includes('href')) {
          return false
        }
        const href = sel.match(/href[*=]?"([^"]+)"/)?.[1]
        return selector.includes(href || '')
      }
      
      return false
    }),
    id: selector.includes('#') ? selector.replace('#', '') : '',
    className: selector.includes('.') ? selector.replace('.', '').replace(/\./g, ' ') : '',
    getAttribute: vi.fn((attr: string) => {
      if (attr === 'data-control-name' && selector.includes('data-control-name')) {
        return selector.match(/data-control-name="([^"]+)"/)?.[1] || ''
      }
      if (attr === 'aria-label' && selector.includes('aria-label')) {
        return selector.match(/aria-label[*=]?"([^"]+)"/)?.[1] || ''
      }
      return null
    })
  } as unknown as Element
  
  return element
}

describe('Prohibited Actions Service Property Tests', () => {
  let prohibitedActionsService: ProhibitedActionsService

  beforeEach(() => {
    prohibitedActionsService = new ProhibitedActionsService()
  })

  test('Property 16: Prohibited Action Prevention - Like Action Type Detection', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('like'),
        fc.constant('react'),
        fc.constant('click_like_button'),
        fc.constant('auto_like')
      ),
      (actionType) => {
        const result = prohibitedActionsService.validateAction(actionType)

        // Property: All like-related action types should be blocked
        expect(result.allowed).toBe(false)
        expect(result.prohibitedAction?.type).toBe('automatic_like')
        expect(result.prohibitedAction?.severity).toBe('high')
        expect(result.reason).toContain('authentic')
      }
    ), { numRuns: 100 })
  })

  test('Property 16: Prohibited Action Prevention - Like Element Detection', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    // Test each selector individually to ensure they work
    const likeSelectors = [
      '[data-control-name="like"]',
      '[data-control-name="reactions-menu-trigger"]',
      '.react-button',
      '.like-button'
    ]
    
    likeSelectors.forEach(selector => {
      const element = mockElement(selector)
      const result = prohibitedActionsService.validateElementInteraction(element)
      
      // Property: All like-related elements should be blocked
      expect(result.allowed).toBe(false)
      expect(result.prohibitedAction?.type).toBe('automatic_like')
      expect(result.prohibitedAction?.severity).toBe('high')
      expect(result.reason).toContain('authentic')
    })
  })

  test('Property 16: Prohibited Action Prevention - Bulk Action Detection', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('bulk_action'),
        fc.constant('mass_operation'),
        fc.constant('select_all'),
        fc.constant('batch_process')
      ),
      (actionType) => {
        const result = prohibitedActionsService.validateAction(actionType)

        // Property: All bulk action types should be blocked
        expect(result.allowed).toBe(false)
        expect(result.prohibitedAction?.type).toBe('bulk_action')
        expect(result.prohibitedAction?.severity).toBe('critical')
        expect(result.reason).toContain('spam')
      }
    ), { numRuns: 100 })
  })

  test('Property 16: Prohibited Action Prevention - Data Scraping Detection', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('export_data'),
        fc.constant('download_contacts'),
        fc.constant('scrape_profiles'),
        fc.constant('extract_data'),
        fc.constant('harvest_info')
      ),
      (actionType) => {
        const result = prohibitedActionsService.validateAction(actionType)

        // Property: All data scraping actions should be blocked
        expect(result.allowed).toBe(false)
        expect(result.prohibitedAction?.type).toBe('data_scraping')
        expect(result.prohibitedAction?.severity).toBe('critical')
        expect(result.reason).toContain('privacy')
      }
    ), { numRuns: 100 })
  })

  test('Property 16: Prohibited Action Prevention - Unauthorized Interaction Detection', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('connect_user'),
        fc.constant('send_invite'),
        fc.constant('follow_user'),
        fc.constant('block_user')
      ),
      (actionType) => {
        const result = prohibitedActionsService.validateAction(actionType)

        // Property: Unauthorized interactions should be blocked
        expect(result.allowed).toBe(false)
        expect(result.prohibitedAction?.type).toBe('unauthorized_interaction')
        expect(result.prohibitedAction?.severity).toBe('medium')
        expect(result.reason).toContain('not supported')
      }
    ), { numRuns: 100 })
  })

  test('Property 16: Prohibited Action Prevention - Allowed Actions', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    fc.assert(fc.property(
      fc.oneof(
        fc.constant('compose'),
        fc.constant('edit'),
        fc.constant('save'),
        fc.constant('view_profile'),
        fc.constant('normal_click')
      ),
      (actionType) => {
        const result = prohibitedActionsService.validateAction(actionType)

        // Property: Normal actions should be allowed
        expect(result.allowed).toBe(true)
        expect(result.prohibitedAction).toBeUndefined()
        expect(result.reason).toBeUndefined()
      }
    ), { numRuns: 100 })
  })

  test('Property 16: Prohibited Action Prevention - Element Validation Consistency', async () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    // Test prohibited elements
    const prohibitedSelectors = [
      '[data-control-name="like"]',
      '[data-control-name="bulk"]',
      '[data-control-name="export"]',
      '[data-control-name="connect"]'
    ]
    
    prohibitedSelectors.forEach(selector => {
      const element = mockElement(selector, 'button')
      const result = prohibitedActionsService.validateElementInteraction(element)
      
      expect(result.allowed).toBe(false)
      expect(result.prohibitedAction).toBeDefined()
      expect(result.prohibitedAction?.type).toMatch(
        /^(automatic_like|bulk_action|data_scraping|unauthorized_interaction)$/
      )
    })
    
    // Test allowed elements
    const allowedSelectors = [
      '[data-control-name="compose"]',
      '.text-input',
      '.submit-button'
    ]
    
    allowedSelectors.forEach(selector => {
      const element = mockElement(selector, 'button')
      const result = prohibitedActionsService.validateElementInteraction(element)
      
      expect(result.allowed).toBe(true)
      expect(result.prohibitedAction).toBeUndefined()
    })
  })

  test('Property 16: Prohibited Action Prevention - Action Type Coverage', () => {
    // **Feature: linkedin-ghostwriter, Property 16: Prohibited Action Prevention**
    
    fc.assert(fc.property(
      fc.constantFrom(
        'automatic_like',
        'bulk_action',
        'data_scraping',
        'unauthorized_interaction'
      ),
      (prohibitedType) => {
        const prohibitedTypes = prohibitedActionsService.getProhibitedActionTypes()
        
        // Property: All prohibited action types should be covered
        expect(prohibitedTypes).toContain(prohibitedType)
        expect(prohibitedTypes).toHaveLength(4)
        
        // Verify each type is a valid string
        prohibitedTypes.forEach(type => {
          expect(typeof type).toBe('string')
          expect(type.length).toBeGreaterThan(0)
        })
      }
    ), { numRuns: 100 })
  })
})