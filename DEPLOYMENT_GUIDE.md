# PostPhantom Deployment Guide

## 🚀 Quick Start - See PostPhantom in Action

### Prerequisites
- Chrome browser
- Supabase account (already configured)
- API keys (already configured)

### Step 1: Load the Chrome Extension

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to: `packages/extension/.output/chrome-mv3/`
   - Select the folder and click "Select Folder"

3. **Verify Installation**
   - You should see "PostPhantom" in your extensions list
   - The extension should be enabled

### Step 2: Deploy Supabase Functions (Optional - Already Deployed)

The backend functions are already configured and ready to use. If you need to redeploy:

```bash
# Login to Supabase (one-time setup)
npx supabase login

# Deploy functions
cd packages/edge-functions
npx supabase functions deploy --project-ref livddfovoslptifnbfek
```

### Step 3: Test PostPhantom

1. **Go to LinkedIn**
   - Open [linkedin.com](https://linkedin.com) in Chrome
   - Navigate to your feed or create a new post

2. **Look for PostPhantom UI**
   - The extension should inject a PostPhantom interface near LinkedIn's post creation area
   - You should see a "PostPhantom" button or panel

3. **Generate Your First Post**
   - Enter a prompt like: "Write about the future of AI in software development"
   - Click "Generate Posts"
   - Review the generated drafts
   - Select one and click "Type into LinkedIn"

### Step 4: Features to Test

#### ✅ Core Features
- **Multi-Draft Generation**: Get 3 different versions of your post
- **Human-in-the-Loop**: Must manually select and approve each draft
- **Natural Typing**: Realistic typing simulation with human-like timing
- **Anti-Cheerleader Warnings**: Detects generic positive content

#### ✅ Safety Features
- **Rate Limiting**: 50 posts per day, 2-minute cooldown
- **Content Moderation**: OpenAI moderation API integration
- **Prohibited Actions**: Blocks automatic likes, bulk actions

#### ✅ AI Providers
- **OpenAI GPT-4**: Default provider for most requests
- **Google Gemini**: Automatic routing for large contexts (>110k tokens)
- **Failover**: Automatic switching if one provider fails

#### ✅ UI Features
- **Loading States**: "Thinking..." indicators with progress
- **Error Handling**: Comprehensive error messages with suggestions
- **Success States**: Confirmation when posts are typed
- **LinkedIn Integration**: Seamless integration with LinkedIn's UI

### Troubleshooting

#### Extension Not Loading
- Check that Developer mode is enabled
- Verify the path points to `.output/chrome-mv3/` folder
- Check browser console for errors (F12 → Console)

#### PostPhantom UI Not Appearing
- Refresh the LinkedIn page
- Check if you're on a supported LinkedIn page (feed, post creation)
- Look for the PostPhantom icon in the extension toolbar

#### Generation Errors
- Check your internet connection
- Verify API keys are configured (they should be)
- Check rate limits (50 posts per day max)

#### Authentication Issues
- The extension uses Supabase Auth
- You may need to sign in through the PostPhantom interface
- Check browser storage permissions

### Configuration

All configuration is already set up in the `.env` files:

#### Extension Config (`packages/extension/.env`)
```
VITE_SUPABASE_URL=https://livddfovoslptifnbfek.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Backend Config (`packages/edge-functions/.env`)
```
SUPABASE_URL=https://livddfovoslptifnbfek.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-A4FcDyQhD6s9PTs2iitT5wbwX1ZHfZ4H_8ZAznsZSn9...
GEMINI_API_KEY=AIzaSyCQU_Gfu0TacaQvXEG_N8gn9gY1K22uSUY
```

### Database Schema

The database is already set up with these tables:
- `ai_model_registry` - Available AI models and capabilities
- `request_logs` - Metadata-only logging (no user content stored)
- `user_preferences` - User settings and preferences
- `context_embeddings` - Vector embeddings for context
- `rate_limits` - Rate limiting and usage tracking

### Next Steps

Once you have PostPhantom running:

1. **Test Different Prompts**: Try various types of LinkedIn posts
2. **Explore Features**: Test the anti-cheerleader warnings, rate limiting
3. **Check Analytics**: View your usage in the browser console
4. **Customize Settings**: Adjust preferences through the UI

### Support

If you encounter issues:
1. Check the browser console (F12 → Console) for error messages
2. Verify all environment variables are set correctly
3. Ensure you're on a supported LinkedIn page
4. Check that the extension has necessary permissions

---

## 🎯 What You'll See

### PostPhantom Workflow
1. **Prompt Input**: Clean, LinkedIn-styled text area
2. **Generation**: "Thinking..." indicator with progress bar
3. **Draft Selection**: Choose from 3 generated options
4. **Editing**: Modify selected draft before posting
5. **Typing**: Natural typing simulation into LinkedIn
6. **Success**: Confirmation that post is ready to publish

### Safety Features in Action
- **Rate Limiting**: Clear messages when limits are reached
- **Content Warnings**: Anti-cheerleader detection for generic content
- **Error Recovery**: Helpful suggestions when things go wrong
- **Human Control**: No automatic posting - you're always in control

Enjoy using PostPhantom! 🚀