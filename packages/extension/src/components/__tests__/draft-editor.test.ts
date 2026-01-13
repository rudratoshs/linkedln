import { describe, test, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { useAppStore, Draft } from '../../store/app-store'

describe('Draft Editor Property Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore())
    act(() => {
      result.current.resetState('Test reset')
      result.current.clearDrafts()
      result.current.setError(null)
    })
  })

  /**
   * Property 12: Draft Editability
   * For any selected draft, the user should be able to edit the content before posting
   */
  test('Property 12: Draft Editability - Store Level', () => {
    fc.assert(fc.property(
      fc.record({
        id: fc.string({ minLength: 1 }),
        content: fc.string({ minLength: 1, maxLength: 1000 }),
        provider: fc.constantFrom('openai', 'gemini'),
        timestamp: fc.integer({ min: 0 }),
        selected: fc.boolean()
      }),
      fc.string({ minLength: 1, maxLength: 1000 }),
      (draft: Draft, newContent: string) => {
        const { result } = renderHook(() => useAppStore())
        
        // Set up draft in store
        act(() => {
          result.current.setDrafts([draft])
          result.current.selectDraft(draft.id, true)
        })

        // Property: Should be able to edit any draft content
        act(() => {
          const success = result.current.updateDraft(draft.id, newContent)
          expect(success).toBe(true)
        })
        
        // Property: Updated draft should have new content
        const updatedDraft = result.current.drafts.find(d => d.id === draft.id)
        expect(updatedDraft?.content).toBe(newContent.trim())
        
        // Property: Selected draft should also be updated
        expect(result.current.selectedDraft?.content).toBe(newContent.trim())
      }
    ), { numRuns: 50 })
  })

  test('Property 12.1: Draft State Maintenance During Editing', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        id: fc.string({ minLength: 1 }),
        content: fc.string({ minLength: 1 }),
        provider: fc.constantFrom('openai', 'gemini'),
        timestamp: fc.integer({ min: 0 }),
        selected: fc.boolean()
      }), { minLength: 1, maxLength: 5 }),
      fc.string({ minLength: 1 }),
      (drafts: Draft[], newContent: string) => {
        const { result } = renderHook(() => useAppStore())
        
        // Set up drafts in store
        act(() => {
          result.current.setDrafts(drafts)
          // Select first draft
          result.current.selectDraft(drafts[0].id, true)
        })

        const selectedDraft = result.current.selectedDraft
        if (selectedDraft) {
          // Property: Should be able to update draft content
          act(() => {
            const success = result.current.updateDraft(selectedDraft.id, newContent)
            expect(success).toBe(true)
          })

          // Property: Updated draft should maintain its state
          const updatedDraft = result.current.drafts.find(d => d.id === selectedDraft.id)
          expect(updatedDraft?.content).toBe(newContent.trim())
          expect(updatedDraft?.provider).toBe(selectedDraft.provider)
          expect(updatedDraft?.id).toBe(selectedDraft.id)
          
          // Property: Selected draft should also be updated
          expect(result.current.selectedDraft?.content).toBe(newContent.trim())
        }
      }
    ), { numRuns: 50 })
  })

  test('Property 12.2: Edit Validation', () => {
    fc.assert(fc.property(
      fc.string(),
      (editContent: string) => {
        const { result } = renderHook(() => useAppStore())
        
        const testDraft: Draft = {
          id: 'test',
          content: 'Original',
          provider: 'openai',
          timestamp: Date.now(),
          selected: true
        }
        
        act(() => {
          result.current.setDrafts([testDraft])
        })

        // Property: Empty content should be rejected
        const isEmpty = editContent.trim().length === 0
        
        act(() => {
          const success = result.current.updateDraft(testDraft.id, editContent)
          expect(success).toBe(!isEmpty)
        })

        // Property: Draft content should only change if valid
        const updatedDraft = result.current.drafts.find(d => d.id === testDraft.id)
        if (isEmpty) {
          expect(updatedDraft?.content).toBe('Original') // Should remain unchanged
        } else {
          expect(updatedDraft?.content).toBe(editContent.trim())
        }
      }
    ), { numRuns: 100 })
  })

  // Unit tests for specific edge cases
  describe('Unit Tests - Draft Editing Store Logic', () => {
    test('should update draft content successfully', () => {
      const { result } = renderHook(() => useAppStore())
      
      const testDraft: Draft = {
        id: 'test-draft',
        content: 'Original content',
        provider: 'openai',
        timestamp: Date.now(),
        selected: true
      }
      
      act(() => {
        result.current.setDrafts([testDraft])
        result.current.selectDraft(testDraft.id, true)
      })
      
      // Update draft content
      act(() => {
        const success = result.current.updateDraft(testDraft.id, 'New content')
        expect(success).toBe(true)
      })
      
      // Check updated content
      const updatedDraft = result.current.drafts.find(d => d.id === testDraft.id)
      expect(updatedDraft?.content).toBe('New content')
      expect(result.current.selectedDraft?.content).toBe('New content')
    })

    test('should reject empty content updates', () => {
      const { result } = renderHook(() => useAppStore())
      
      const testDraft: Draft = {
        id: 'test-draft',
        content: 'Original content',
        provider: 'openai',
        timestamp: Date.now(),
        selected: true
      }
      
      act(() => {
        result.current.setDrafts([testDraft])
      })
      
      // Try to update with empty content
      act(() => {
        const success = result.current.updateDraft(testDraft.id, '   ')
        expect(success).toBe(false)
      })
      
      // Content should remain unchanged
      const updatedDraft = result.current.drafts.find(d => d.id === testDraft.id)
      expect(updatedDraft?.content).toBe('Original content')
    })

    test('should handle non-existent draft updates', () => {
      const { result } = renderHook(() => useAppStore())
      
      // Try to update non-existent draft
      act(() => {
        const success = result.current.updateDraft('non-existent', 'New content')
        expect(success).toBe(false)
      })
    })

    test('should trim whitespace from updated content', () => {
      const { result } = renderHook(() => useAppStore())
      
      const testDraft: Draft = {
        id: 'test-draft',
        content: 'Original content',
        provider: 'openai',
        timestamp: Date.now(),
        selected: true
      }
      
      act(() => {
        result.current.setDrafts([testDraft])
      })
      
      // Update with content that has whitespace
      act(() => {
        const success = result.current.updateDraft(testDraft.id, '  New content  ')
        expect(success).toBe(true)
      })
      
      // Content should be trimmed
      const updatedDraft = result.current.drafts.find(d => d.id === testDraft.id)
      expect(updatedDraft?.content).toBe('New content')
    })

    test('should maintain other draft properties during update', () => {
      const { result } = renderHook(() => useAppStore())
      
      const testDraft: Draft = {
        id: 'test-draft',
        content: 'Original content',
        provider: 'gemini',
        timestamp: 12345,
        selected: false
      }
      
      act(() => {
        result.current.setDrafts([testDraft])
      })
      
      // Update content
      act(() => {
        result.current.updateDraft(testDraft.id, 'New content')
      })
      
      // Other properties should remain unchanged
      const updatedDraft = result.current.drafts.find(d => d.id === testDraft.id)
      expect(updatedDraft?.id).toBe('test-draft')
      expect(updatedDraft?.provider).toBe('gemini')
      expect(updatedDraft?.timestamp).toBe(12345)
      expect(updatedDraft?.selected).toBe(false)
    })
  })
})

// **Feature: linkedin-ghostwriter, Property 12: Draft Editability**