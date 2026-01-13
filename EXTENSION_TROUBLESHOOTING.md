# PostPhantom Extension Troubleshooting Guide

## 🚀 Quick Fix for "Extension Context Invalidated" Error

The "Extension context invalidated" error occurs when Chrome reloads or updates the extension. Here's how to fix it:

### Immediate Fix:
1. **Go to Chrome Extensions** (`chrome://extensions/`)
2. **Remove PostPhantom** (click "Remove")
3. **Reload Fresh Extension**:
   - Click "Load unpacked"
   - Select: `packages/extension/.output/chrome-mv3/`
4. **Refresh LinkedIn** page
5. **PostPhantom should now work** without errors

### What We Fixed:

✅ **Context Validation** - Extension now checks if Chrome context is valid  
✅ **Graceful Fallbacks** - Uses localStorage if Chrome storage fails  
✅ **Robust Error Handling** - Shows user-friendly error messages  
✅ **Multiple Initialization** - Tries different loading strategies  
✅ **SPA Navigation** - Handles LinkedIn's single-page app navigation  
✅ **Element Detection** - Multiple selectors for LinkedIn text areas  
✅ **Comprehensive Events** - Triggers all necessary events for LinkedIn  

## 🔧 Common Issues & Solutions

### Issue 1: Extension Won't Load
**Symptoms**: Extension appears disabled or shows errors
**Solution**:
1. Enable "Developer mode" in Chrome Extensions
2. Make sure you're selecting the `chrome-mv3` folder specifically
3. Check Chrome console for specific error messages

### Issue 2: PostPhantom UI Not Appearing
**Symptoms**: No PostPhantom panel on LinkedIn
**Solutions**:
1. **Refresh LinkedIn page** - Extension loads after page load
2. **Check URL** - Must be on `linkedin.com` or `*.linkedin.com`
3. **Wait for LinkedIn** - Extension waits for LinkedIn's post composer to load
4. **Check Console** - Press F12 and look for PostPhantom messages

### Issue 3: "LinkedIn text area not found"
**Symptoms**: Error when trying to type content
**Solutions**:
1. **Navigate to LinkedIn feed** - Extension works best on main feed
2. **Click "Start a post"** - Make sure post composer is open
3. **Try different LinkedIn pages** - Feed, profile, company pages
4. **Refresh and retry** - LinkedIn's DOM changes dynamically

### Issue 4: Content Generation Fails
**Symptoms**: "Generation failed" or network errors
**Solutions**:
1. **Check internet connection**
2. **Wait 2 minutes** - Rate limiting is active
3. **Try different prompts** - Some content may be filtered
4. **Fallback mode** - Extension provides mock content if API fails

### Issue 5: Extension Context Invalidated
**Symptoms**: Storage errors, extension stops working
**Solutions**:
1. **Reload extension** (remove and re-add)
2. **Restart Chrome browser**
3. **Clear extension data** in Chrome settings
4. **Extension auto-recovers** using localStorage fallback

## 🎯 Testing Steps

### 1. Load Extension
```
1. Go to chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select: packages/extension/.output/chrome-mv3/
5. Verify "PostPhantom" appears and is enabled
```

### 2. Test on LinkedIn
```
1. Go to linkedin.com
2. Wait 2-3 seconds for PostPhantom to load
3. Look for PostPhantom panel (top-right corner)
4. If not visible, refresh page and wait
```

### 3. Generate Content
```
1. Enter prompt: "Share insights about remote work"
2. Click "Generate Posts"
3. Wait for 3 drafts to appear
4. Click "Type into LinkedIn" on any draft
5. Verify content appears in LinkedIn text area
```

### 4. Verify Functionality
```
✅ Extension loads without errors
✅ PostPhantom UI appears on LinkedIn
✅ Content generation works (real or mock)
✅ Typing simulation works
✅ Rate limiting prevents spam
✅ Error messages are user-friendly
✅ Extension recovers from context invalidation
```

## 🔍 Debug Information

### Check Extension Console
1. Go to `chrome://extensions/`
2. Find PostPhantom
3. Click "Inspect views: service worker" or "background page"
4. Look for error messages

### Check Page Console
1. On LinkedIn, press F12
2. Go to Console tab
3. Look for PostPhantom messages:
   - `🔗 PostPhantom content script loaded`
   - `✅ PostPhantom initialized successfully`
   - Any error messages in red

### Extension Status Messages
- `🔄 Initializing PostPhantom...` - Starting up
- `✅ PostPhantom initialized successfully` - Ready to use
- `❌ PostPhantom initialization failed` - Check errors
- `ℹ️ Not on LinkedIn, skipping initialization` - Wrong page

## 🛠️ Advanced Troubleshooting

### Reset Extension Completely
```bash
# In terminal, rebuild extension
cd packages/extension
npm run build

# Then reload in Chrome
```

### Clear All Extension Data
1. Go to Chrome Settings → Privacy → Site Settings
2. Find LinkedIn and PostPhantom
3. Clear all data and permissions
4. Reload extension and grant permissions again

### Test in Incognito Mode
1. Enable extension in incognito mode
2. Test on LinkedIn in incognito window
3. This isolates extension from other Chrome data

### Check Network Requests
1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Generate content in PostPhantom
4. Look for requests to `supabase.co`
5. Check if requests succeed or fail

## 📞 Still Having Issues?

If PostPhantom still doesn't work after trying these solutions:

1. **Check Chrome Version** - Ensure you're using Chrome 88+
2. **Disable Other Extensions** - Test with only PostPhantom enabled
3. **Try Different LinkedIn Pages** - Feed, profile, company pages
4. **Check Console Logs** - Share any error messages
5. **Test with Mock Data** - Extension should work even if API fails

The extension is designed to be robust and should work even with network issues or API failures by providing mock content generation.

## 🎉 Success Indicators

When PostPhantom is working correctly, you should see:
- PostPhantom panel appears on LinkedIn within 2-3 seconds
- Content generation completes in 3-5 seconds
- Typing simulation works smoothly
- Rate limiting messages appear when appropriate
- No red error messages in console
- Extension survives page navigation and refreshes