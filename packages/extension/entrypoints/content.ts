import { defineContentScript } from 'wxt/sandbox'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { PostPhantomApp } from '../src/components/PostPhantomApp'
import { shadowDOMInjector } from '../src/content/shadow-dom-injector'

// Use environment variables for Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default defineContentScript({
  matches: ['https://www.linkedin.com/*', 'https://linkedin.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    console.log('🚀 PostPhantom: Real Architecture Starting...')

    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ PostPhantom: Missing Supabase configuration. Please check your .env file.')
      return
    }

    let uiInstance: any = null

    // 1. Observe DOM for the LinkedIn message box (The "Wedge")
    const observer = new MutationObserver((mutations) => {
      // Look for the editor box
      const editor = document.querySelector('.ql-editor[contenteditable="true"]')
      
      // If found and we haven't injected yet:
      if (editor && !editor.getAttribute('data-postphantom-loaded')) {
        editor.setAttribute('data-postphantom-loaded', 'true')
        mountUI(editor as HTMLElement)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    // Also check immediately in case the editor is already present
    const existingEditor = document.querySelector('.ql-editor[contenteditable="true"]')
    if (existingEditor && !existingEditor.getAttribute('data-postphantom-loaded')) {
      existingEditor.setAttribute('data-postphantom-loaded', 'true')
      mountUI(existingEditor as HTMLElement)
    }

    async function mountUI(targetElement: HTMLElement) {
      try {
        console.log('🎯 PostPhantom: Mounting UI near LinkedIn editor')

        // Clean up any existing UI
        if (uiInstance) {
          uiInstance.cleanup()
          uiInstance = null
        }

        // Use the ShadowDOM Injector to keep styles isolated
        uiInstance = await shadowDOMInjector.createUI({
          targetElement: targetElement.parentElement || targetElement,
          position: 'after',
          className: 'postphantom-ui-host',
          zIndex: 10000
        })

        console.log('✅ PostPhantom: UI mounted successfully with Shadow DOM isolation')

      } catch (error) {
        console.error('❌ PostPhantom: Failed to mount UI:', error)
        
        // Fallback to recovery strategies
        try {
          uiInstance = await shadowDOMInjector.recoverFromInjectionFailure(targetElement)
          if (uiInstance) {
            console.log('✅ PostPhantom: UI recovered using fallback strategy')
          }
        } catch (recoveryError) {
          console.error('❌ PostPhantom: All UI mounting strategies failed:', recoveryError)
        }
      }
    }

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      if (uiInstance) {
        uiInstance.cleanup()
      }
      shadowDOMInjector.cleanupAll()
    })

    console.log('✅ PostPhantom: Content script initialized successfully')
  },
})