import React, { useEffect } from 'react'
import { useAppStore } from '../store/app-store'

/**
 * PostButtonGuard - Prevents automatic clicking of LinkedIn's Post button
 * Enforces human-in-the-loop governance by blocking any automated posting
 * Requirements: 5.1, 5.3
 */
export const PostButtonGuard: React.FC = () => {
  const { preventAutoPosting, currentState } = useAppStore()

  useEffect(() => {
    // Find LinkedIn's post button and add protection
    const protectPostButtons = () => {
      // Common LinkedIn post button selectors
      const postButtonSelectors = [
        'button[data-control-name="publish.post"]',
        'button[aria-label*="Post"]',
        'button[data-test-id="post-button"]',
        '.share-actions button[type="submit"]',
        '.composer-submit-button'
      ]

      postButtonSelectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector)
        buttons.forEach(button => {
          if (button instanceof HTMLElement && !button.dataset.postphantomProtected) {
            protectButton(button)
          }
        })
      })
    }

    const protectButton = (button: HTMLElement) => {
      // Mark as protected
      button.dataset.postphantomProtected = 'true'

      // Override click events to prevent automatic posting
      const originalClick = button.click
      button.click = function(this: HTMLElement) {
        // Always prevent automatic posting
        if (!preventAutoPosting()) {
          console.error('SECURITY: Automatic posting blocked by PostPhantom human-in-the-loop governance')
          return
        }

        // Only allow if user is in typing state and has explicitly approved
        if (currentState !== 'typing') {
          console.warn('Post button click blocked - not in typing state')
          return
        }

        // Log human approval
        console.log('Post button click allowed - human explicitly approved in typing state')
        
        // Call original click method
        originalClick.call(this)
      }

      // Add event listener to intercept programmatic clicks
      button.addEventListener('click', (event) => {
        // Check if this is a programmatic click (no user interaction)
        if (!event.isTrusted) {
          event.preventDefault()
          event.stopImmediatePropagation()
          console.error('SECURITY: Programmatic post button click blocked')
          return false
        }

        // Validate state machine allows posting
        if (currentState !== 'typing') {
          event.preventDefault()
          event.stopImmediatePropagation()
          console.warn('Post button click blocked - invalid state:', currentState)
          return false
        }
      }, { capture: true })
    }

    // Initial protection
    protectPostButtons()

    // Monitor for new post buttons (LinkedIn SPA)
    const observer = new MutationObserver(() => {
      protectPostButtons()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
    }
  }, [preventAutoPosting, currentState])

  return null // This component doesn't render anything
}