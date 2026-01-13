import { defineUnlistedScript } from 'wxt/sandbox'

export default defineUnlistedScript(() => {
  // Popup script for PostPhantom extension
  console.log('PostPhantom popup loaded')

  // Set up the popup HTML
  document.body.innerHTML = `
    <div style="width: 300px; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0;">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="font-size: 24px; margin-right: 10px;">🚀</div>
        <div style="font-size: 18px; font-weight: 600; color: #0a66c2;">PostPhantom</div>
      </div>
      
      <div id="status" style="padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;">
        <strong>Status:</strong> Checking LinkedIn...
      </div>
      
      <div style="font-size: 13px; color: #666; line-height: 1.4; margin-bottom: 15px;">
        PostPhantom works automatically when you're composing a LinkedIn post. Look for the AI assistant near the text editor.
      </div>
      
      <button id="openLinkedIn" style="background: #0a66c2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; width: 100%; margin-bottom: 8px;">
        Open LinkedIn
      </button>
      
      <button id="refreshStatus" style="background: #666; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px; width: 100%; margin-bottom: 8px;">
        Refresh Status
      </button>
      
      <div style="font-size: 11px; color: #999; text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
        v1.0.0 • AI-powered LinkedIn assistant
      </div>
    </div>
  `

  // DOM elements
  const statusDiv = document.getElementById('status') as HTMLDivElement
  const openLinkedInBtn = document.getElementById('openLinkedIn') as HTMLButtonElement
  const refreshStatusBtn = document.getElementById('refreshStatus') as HTMLButtonElement

  // Check if user is currently on LinkedIn
  async function checkLinkedInStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tab?.url?.includes('linkedin.com')) {
        statusDiv.style.cssText = 'padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; background: #e8f5e8; color: #2d5a2d; border: 1px solid #c3e6c3;'
        statusDiv.innerHTML = '<strong>Status:</strong> ✅ Active on LinkedIn'
        openLinkedInBtn.textContent = 'Refresh LinkedIn'
      } else {
        statusDiv.style.cssText = 'padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;'
        statusDiv.innerHTML = '<strong>Status:</strong> ⚠️ Not on LinkedIn'
        openLinkedInBtn.textContent = 'Open LinkedIn'
      }
    } catch (error) {
      console.error('Failed to check LinkedIn status:', error)
      statusDiv.style.cssText = 'padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
      statusDiv.innerHTML = '<strong>Status:</strong> ❌ Unable to check'
    }
  }

  // Open or refresh LinkedIn
  async function openLinkedIn() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tab?.url?.includes('linkedin.com')) {
        // Refresh current LinkedIn tab
        await chrome.tabs.reload(tab.id!)
      } else {
        // Open LinkedIn in new tab
        await chrome.tabs.create({ url: 'https://www.linkedin.com' })
      }
      
      // Close popup after action
      window.close()
    } catch (error) {
      console.error('Failed to open LinkedIn:', error)
    }
  }

  // Event listeners
  openLinkedInBtn.addEventListener('click', openLinkedIn)
  refreshStatusBtn.addEventListener('click', checkLinkedInStatus)

  // Initialize status check
  checkLinkedInStatus()
})