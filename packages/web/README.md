# PostPhantom Web Dashboard

A React-based web dashboard for managing PostPhantom AI content generation settings, personas, and analytics.

## Features

- **Authentication**: Secure login/signup using Supabase Auth
- **Voice Vault**: Create and manage AI personas with CRUD operations
- **History**: View content generation history and analytics
- **Settings**: Configure AI preferences that sync with the Chrome extension
- **Pricing**: Billing and subscription management (Stripe integration ready)

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + Radix UI components
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with custom storage adapter
- **State Management**: React hooks + Zustand (for complex state)
- **Routing**: React Router DOM

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase project with PostPhantom schema

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key  # Optional
```

### Running the Development Server

```bash
# Install dependencies (from workspace root)
pnpm install

# Start development server
pnpm dev

# Or run from workspace root
pnpm --filter @postphantom/web dev
```

The dashboard will be available at `http://localhost:3000`.

### Building for Production

```bash
# Build the application
pnpm build

# Preview the production build
pnpm preview
```

## Architecture

### Database Integration

The dashboard connects to the same Supabase database as the Chrome extension, sharing:

- User authentication and profiles
- Voice personas and content templates
- Request logs and analytics
- User preferences and settings

### Authentication Flow

1. User signs up/logs in via Supabase Auth
2. Custom web storage adapter handles session persistence
3. Row Level Security (RLS) ensures data isolation
4. Settings automatically sync with Chrome extension

### Key Components

- **AuthPage**: Login/signup form with error handling
- **Layout**: Navigation sidebar with responsive design
- **VoiceVaultPage**: Full CRUD for AI personas
- **HistoryPage**: Analytics and request log viewer
- **SettingsPage**: Preference management with real-time sync
- **PricingPage**: Subscription plans and billing portal

### Data Flow

```
User Action → React Hook → Database Service → Supabase → PostgreSQL
                ↓
         UI Update ← State Update ← Response Data ← Query Result
```

## Integration with Chrome Extension

The web dashboard and Chrome extension share the same:

- **Database schema**: All tables and relationships
- **Authentication system**: Supabase Auth with different storage adapters
- **User preferences**: Real-time synchronization
- **Voice personas**: Shared persona library

Settings changed in the dashboard are immediately available in the extension and vice versa.

## Deployment

The web dashboard can be deployed to any static hosting service:

- **Vercel**: Automatic deployments from Git
- **Netlify**: Static site hosting with serverless functions
- **AWS S3 + CloudFront**: Static hosting with CDN
- **Supabase Hosting**: Integrated with your Supabase project

### Environment Variables for Production

Ensure these are set in your deployment environment:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # For production billing
```

## Security

- **Row Level Security**: Database-level access control
- **Authentication**: Secure token-based auth via Supabase
- **HTTPS Only**: All API calls use secure connections
- **No Sensitive Data**: Payment processing handled by Stripe
- **Content Security**: No user-generated content stored in database

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Charts and detailed usage metrics
- **Team Management**: Multi-user workspace support
- **API Access**: REST API for third-party integrations
- **Mobile App**: React Native version of the dashboard