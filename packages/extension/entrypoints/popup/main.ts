// Popup script for PostPhantom extension
console.log('PostPhantom popup loaded')

// DOM elements
const statusDiv = document.getElementById('status') as HTMLDivElement
const openLinkedInBtn = document.getElementById('openLinkedIn') as HTMLButtonElement
const refreshStatusBtn = document.getElementById('refreshStatus') as HTMLButtonElement

// Check if user is currently on LinkedIn
async function checkLinkedInStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (tab?.url?.includes('linkedin.com')) {
      statusDiv.className = 'status active'
      statusDiv.innerHTML = '<strong>Status:</strong> ✅ Active on LinkedIn'
      openLinkedInBtn.textContent = 'Refresh LinkedIn'
    } else {
      statusDiv.className = 'status inactive'
      statusDiv.innerHTML = '<strong>Status:</strong> ⚠️ Not on LinkedIn'
      openLinkedInBtn.textContent = 'Open LinkedIn'
    }
  } catch (error) {
    console.error('Failed to check LinkedIn status:', error)
    statusDiv.className = 'status error'
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
openLinkedInBtn?.addEventListener('click', openLinkedIn)
refreshStatusBtn?.addEventListener('click', checkLinkedInStatus)

// Initialize status check
checkLinkedInStatus()