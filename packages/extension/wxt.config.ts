import { defineConfig } from 'wxt'
import react from '@vitejs/plugin-react'

export default defineConfig({
  vite: () => ({
    plugins: [react()],
    define: {
      // Support both process.env and import.meta.env patterns
      'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
    }
  }),
  manifest: {
    name: 'PostPhantom',
    description: 'AI-powered LinkedIn content assistance with human-in-the-loop governance',
    version: '1.0.0',
    action: {
      default_title: "PostPhantom - AI LinkedIn Assistant",
      default_popup: "popup.html"
    },
    permissions: [
      'activeTab',
      'storage',
      'scripting'
    ],
    host_permissions: [
      'https://linkedin.com/*',
      'https://*.linkedin.com/*',
      'https://*.supabase.co/*'
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'self' https://*.supabase.co https://linkedin.com https://*.linkedin.com"
    },
    web_accessible_resources: [
      {
        resources: ["*.js", "*.css"],
        matches: ["https://linkedin.com/*", "https://*.linkedin.com/*"]
      }
    ]
  }
})