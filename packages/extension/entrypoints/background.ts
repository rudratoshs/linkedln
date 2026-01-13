import { defineBackground } from 'wxt/sandbox'

export default defineBackground(() => {
  console.log('PostPhantom background script loaded')
  
  // Handle extension installation
  chrome.runtime.onInstalled.addListener(() => {
    console.log('PostPhantom extension installed')
  })
})