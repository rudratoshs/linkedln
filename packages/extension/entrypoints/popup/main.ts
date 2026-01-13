// Popup script for PostPhantom extension
console.log('PostPhantom popup loaded')

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', initializePopup)

function initializePopup() {
  console.log('DOM ready, initializing popup...')
  
  // DOM elements
  const statusDiv = document.getElementById('status') as HTMLDivElement
  const openLinkedInBtn = document.getElementById('openLinkedIn') as HTMLButtonElement
  const refreshStatusBtn = document.getElementById('refreshStatus') as HTMLButtonElement

  if (!statusDiv || !openLinkedInBtn || !refreshStatusBtn) {
    console.error('Popup elements not found:', { statusDiv, openLinkedInBtn, refreshStatusBtn })
    return
  }

  // Check if user is currently on LinkedIn
  async function checkLinkedInStatus() {
    console.log('Checking LinkedIn status...')
    try {
      // Check if chrome.tabs API is available
      if (!chrome?.tabs?.query) {
        console.error('Chrome tabs API not available')
        statusDiv.className = 'status error'
        statusDiv.innerHTML = '<strong>Status:</strong> ❌ Chrome API unavailable'
        return
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      console.log('Active tabs:', tabs)
      
      const activeTab = tabs[0]
      if (!activeTab?.url) {
        console.warn('No active tab or URL found')
        statusDiv.className = 'status error'
        statusDiv.innerHTML = '<strong>Status:</strong> ❌ No active tab'
        return
      }

      console.log('Active tab URL:', activeTab.url)
      
      if (activeTab.url.includes('linkedin.com')) {
        console.log('User is on LinkedIn')
        statusDiv.className = 'status active'
        statusDiv.innerHTML = '<strong>Status:</strong> ✅ Active on LinkedIn'
        openLinkedInBtn.textContent = 'Refresh LinkedIn'
      } else {
        console.log('User is not on LinkedIn')
        statusDiv.className = 'status inactive'
        statusDiv.innerHTML = '<strong>Status:</strong> ⚠️ Not on LinkedIn'
        openLinkedInBtn.textContent = 'Open LinkedIn'
      }
    } catch (error) {
      console.error('Failed to check LinkedIn status:', error)
      statusDiv.className = 'status error'
      statusDiv.innerHTML = '<strong>Status:</strong> ❌ Error checking status'
    }
  }

  // Open or refresh LinkedIn
  async function openLinkedIn() {
    console.log('Opening/refreshing LinkedIn...')
    try {
      if (!chrome?.tabs?.query || !chrome?.tabs?.reload || !chrome?.tabs?.create) {
        console.error('Chrome tabs API not available')
        return
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]
      
      if (activeTab?.url?.includes('linkedin.com')) {
        // Refresh current LinkedIn tab
        console.log('Refreshing LinkedIn tab')
        await chrome.tabs.reload(activeTab.id!)
      } else {
        // Open LinkedIn in new tab
        console.log('Opening new LinkedIn tab')
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
  console.log('Running initial status check...')
  checkLinkedInStatus()
}

// Also run immediately if DOM is already ready
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  console.log('DOM still loading, waiting...')
} else {
  // DOM is already ready
  console.log('DOM already ready, initializing immediately')
  initializePopup()
}