import { describe, test, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import { 
  detectCheerleaderPatterns, 
  shouldShowCheerleaderWarning, 
  getCheerleaderSeverity 
} from '../AntiCheerleaderWarning'
import { useAppStore } from '../../store/app-store'

describe('Anti-Cheerleader Warning System Property Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore())
    act(() => {
      result.current.resetState('Test reset')
      result.current.dismissCheerleaderWarning()
    })
  })

  /**
   * Property 13: Anti-Cheerleader Warning System
   * For any generic positive content detected, the system should display appropriate warnings
   * to discourage low-value engagement
   */
  test('Property 13: Anti-Cheerleader Warning Detection', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 200 }),
      (content: string) => {
        const warnings = detectCheerleaderPatterns(content)
        const shouldWarn = shouldShowCheerleaderWarning(content)
        const severity = getCheerleaderSeverity(content)
        
        // Property: Warning detection should be consistent
        expect(shouldWarn).toBe(warnings.length > 0)
        
        // Property: Severity should correlate with warning presence
        if (warnings.length > 0) {
          expect(severity).toBeGreaterThan(0)
        }
        
        // Property: Severity should be bounded
        expect(severity).toBeGreaterThanOrEqual(0)
        expect(severity).toBeLessThanOrEqual(10)
        
        // Property: More warnings should generally mean higher severity
        if (warnings.length > 3) {
          expect(severity).toBeGreaterThan(5)
        }
      }
    ), { numRuns: 100 })
  })

  test('Property 13.1: Generic Content Detection Patterns', () => {
    fc.assert(fc.property(
      fc.constantFrom(
        'congrats!', 'awesome!', 'great!', 'amazing!', 'fantastic!',
        'exactly', 'this', 'yes', 'agreed', 'totally',
        '👍', '🎉', '💯', '🔥',
        'inspiring', 'motivating', 'powerful',
        'thanks for sharing', 'great post', 'nice share'
      ),
      (genericContent: string) => {
        const warnings = detectCheerleaderPatterns(genericContent)
        const shouldWarn = shouldShowCheerleaderWarning(genericContent)
        
        // Property: Known generic content should trigger warnings
        expect(shouldWarn).toBe(true)
        expect(warnings.length).toBeGreaterThan(0)
        
        // Property: Generic content should have measurable severity
        const severity = getCheerleaderSeverity(genericContent)
        expect(severity).toBeGreaterThan(0)
      }
    ), { numRuns: 50 })
  })

  test('Property 13.2: Substantive Content Should Not Trigger Warnings', () => {
    fc.assert(fc.property(
      fc.record({
        topic: fc.constantFrom('technology', 'business', 'career', 'innovation'),
        insight: fc.constantFrom(
          'based on my experience with', 
          'I found that when implementing',
          'the key challenge here is',
          'this reminds me of a project where'
        ),
        detail: fc.string({ minLength: 20, maxLength: 100 })
      }),
      ({ topic, insight, detail }) => {
        const substantiveContent = `${insight} ${topic}, ${detail}. This approach has proven effective in my work.`
        
        const warnings = detectCheerleaderPatterns(substantiveContent)
        const shouldWarn = shouldShowCheerleaderWarning(substantiveContent)
        
        // Property: Substantive content should not trigger warnings
        expect(shouldWarn).toBe(false)
        expect(warnings.length).toBe(0)
        
        // Property: Substantive content should have low severity
        const severity = getCheerleaderSeverity(substantiveContent)
        expect(severity).toBeLessThanOrEqual(2)
      }
    ), { numRuns: 50 })
  })

  test('Property 13.3: Store Integration', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (content: string) => {
        const { result } = renderHook(() => useAppStore())
        
        // Property: Store should correctly identify cheerleader content
        const storeDetection = result.current.checkForCheerleaderContent(content)
        const directDetection = shouldShowCheerleaderWarning(content)
        
        expect(storeDetection).toBe(directDetection)
        
        // Property: Showing warning should update store state
        if (storeDetection) {
          act(() => {
            result.current.showCheerleaderWarning(content)
          })
          
          expect(result.current.cheerleaderWarning).not.toBeNull()
          expect(result.current.cheerleaderWarning?.isVisible).toBe(true)
          expect(result.current.cheerleaderWarning?.content).toBe(content)
          
          // Property: Dismissing should clear warning
          act(() => {
            result.current.dismissCheerleaderWarning()
          })
          
          expect(result.current.cheerleaderWarning).toBeNull()
        }
      }
    ), { numRuns: 50 })
  })

  // Unit tests for specific patterns
  describe('Unit Tests - Specific Pattern Detection', () => {
    test('should detect generic congratulations', () => {
      const genericCongrats = ['congrats!', 'congratulations', 'well done', 'good job', 'nice work']
      
      genericCongrats.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Generic congratulations'))).toBe(true)
      })
    })

    test('should detect emoji-only responses', () => {
      const emojiResponses = ['👍', '🎉💯', '🔥🔥🔥', '😍❤️']
      
      emojiResponses.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Emoji-only'))).toBe(true)
      })
    })

    test('should detect generic agreement', () => {
      const genericAgreement = ['exactly', 'this', 'yes', 'agreed', 'totally', 'absolutely']
      
      genericAgreement.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Generic agreement'))).toBe(true)
      })
    })

    test('should detect vague positive statements', () => {
      const vaguePositive = ['inspiring', 'motivating', 'powerful', 'incredible']
      
      vaguePositive.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Vague positive'))).toBe(true)
      })
    })

    test('should detect very short responses', () => {
      const shortResponses = ['ok', 'yes', 'no', 'wow', 'nice']
      
      shortResponses.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Very short'))).toBe(true)
      })
    })

    test('should detect generic questions', () => {
      const genericQuestions = ['how?', 'what?', 'really?', 'thoughts?']
      
      genericQuestions.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Generic question'))).toBe(true)
      })
    })

    test('should detect excessive superlatives', () => {
      const excessiveSuperlatives = [
        'amazing awesome fantastic',
        'incredible brilliant outstanding',
        'perfect excellent amazing'
      ]
      
      excessiveSuperlatives.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('superlatives'))).toBe(true)
      })
    })

    test('should detect generic networking', () => {
      const genericNetworking = ['lets connect', 'dm me', 'following', 'followed']
      
      genericNetworking.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some(w => w.includes('Generic networking'))).toBe(true)
      })
    })

    test('should not flag substantive content', () => {
      const substantiveContent = [
        'This approach worked well in my experience implementing similar solutions at scale.',
        'I found that the key challenge is balancing performance with maintainability.',
        'Based on our recent project, I would recommend considering the security implications.',
        'The data suggests that this trend will continue, particularly in emerging markets.'
      ]
      
      substantiveContent.forEach(content => {
        const warnings = detectCheerleaderPatterns(content)
        expect(warnings.length).toBe(0)
      })
    })

    test('should calculate severity correctly', () => {
      // High severity content
      expect(getCheerleaderSeverity('👍')).toBeGreaterThan(5)
      expect(getCheerleaderSeverity('yes')).toBeGreaterThan(3)
      expect(getCheerleaderSeverity('amazing awesome fantastic')).toBeGreaterThan(4)
      
      // Low severity content
      expect(getCheerleaderSeverity('This is a detailed analysis of the market trends.')).toBeLessThanOrEqual(2)
      expect(getCheerleaderSeverity('I appreciate your insights on this complex topic.')).toBeLessThanOrEqual(2)
    })

    test('should handle edge cases', () => {
      // Empty content
      expect(detectCheerleaderPatterns('')).toEqual([])
      expect(shouldShowCheerleaderWarning('')).toBe(false)
      expect(getCheerleaderSeverity('')).toBe(0)
      
      // Whitespace only
      expect(detectCheerleaderPatterns('   ')).toEqual([])
      expect(shouldShowCheerleaderWarning('   ')).toBe(false)
      
      // Mixed case
      expect(shouldShowCheerleaderWarning('AWESOME!')).toBe(true)
      expect(shouldShowCheerleaderWarning('Exactly!')).toBe(true)
    })
  })

  describe('Store Integration Tests', () => {
    test('should manage cheerleader warning state', () => {
      const { result } = renderHook(() => useAppStore())
      
      // Initially no warning
      expect(result.current.cheerleaderWarning).toBeNull()
      
      // Show warning
      act(() => {
        result.current.showCheerleaderWarning('awesome!')
      })
      
      expect(result.current.cheerleaderWarning).not.toBeNull()
      expect(result.current.cheerleaderWarning?.isVisible).toBe(true)
      expect(result.current.cheerleaderWarning?.content).toBe('awesome!')
      expect(result.current.cheerleaderWarning?.warnings.length).toBeGreaterThan(0)
      expect(result.current.cheerleaderWarning?.severity).toBeGreaterThan(0)
      
      // Dismiss warning
      act(() => {
        result.current.dismissCheerleaderWarning()
      })
      
      expect(result.current.cheerleaderWarning).toBeNull()
    })

    test('should check content correctly', () => {
      const { result } = renderHook(() => useAppStore())
      
      // Generic content should be detected
      expect(result.current.checkForCheerleaderContent('awesome!')).toBe(true)
      expect(result.current.checkForCheerleaderContent('exactly')).toBe(true)
      expect(result.current.checkForCheerleaderContent('👍')).toBe(true)
      
      // Substantive content should not be detected
      expect(result.current.checkForCheerleaderContent('This is a detailed analysis of the problem.')).toBe(false)
      expect(result.current.checkForCheerleaderContent('Based on my experience, I recommend this approach.')).toBe(false)
    })
  })
})

// **Feature: linkedin-ghostwriter, Property 13: Anti-Cheerleader Warning System**