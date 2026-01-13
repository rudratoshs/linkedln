import { defineContentScript } from 'wxt/sandbox'

export default defineContentScript({
  matches: ['https://linkedin.com/*', 'https://*.linkedin.com/*'],
  main() {
    console.log('🔗 PostPhantom minimal content script loaded')
    
    // Test basic functionality without Chrome APIs
    const testBasicFunctionality = () => {
      try {
        // Simple DOM injection test
        const testDiv = document.createElement('div')
        testDiv.id = 'postphantom-test'
        testDiv.innerHTML = `
          <div style="
            position: fixed;
            top: 10px;
            right: 10px;
            background: green;
            color: white;
            padding: 10px;
            border-radius: 4px;
            z-index: 999999;
            font-family: Arial, sans-serif;
          ">
            PostPhantom Test - Working!
            <button onclick="this.parentElement.remove()" style="
              margin-left: 10px;
              background: white;
              color: green;
              border: none;
              padding: 2px 6px;
              border-radius: 2px;
              cursor: pointer;
            ">×</button>
          </div>
        `
        document.body.appendChild(testDiv)
        console.log('✅ Basic DOM injection successful')
        
        // Test Chrome API access
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          try {
            const id = chrome.runtime.id
            console.log('✅ Chrome runtime accessible, ID:', id)
          } catch (error) {
            console.error('❌ Chrome runtime access failed:', error)
          }
        } else {
          console.warn('⚠️ Chrome runtime not available')
        }
        
      } catch (error) {
        console.error('❌ Basic functionality test failed:', error)
      }
    }

    // Run test immediately and after delay
    testBasicFunctionality()
    setTimeout(testBasicFunctionality, 2000)
  },
})