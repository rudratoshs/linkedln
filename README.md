# PostPhantom - LinkedIn AI Ghostwriter

🚀 AI-powered LinkedIn content assistance with human-in-the-loop governance

## Overview

PostPhantom is a Chrome extension that provides AI-powered content generation for LinkedIn posts while maintaining strict human oversight and ethical guidelines.

## Features

- ✅ **Multi-Provider AI Generation** - OpenAI GPT-4 and Google Gemini support
- ✅ **Human-in-the-Loop Governance** - Prevents automation, requires human approval
- ✅ **Rate Limiting** - 50 generations/day, 2-minute cooldown, hourly limits
- ✅ **Natural Typing Simulation** - WindMouse algorithm for human-like interaction
- ✅ **Anti-Cheerleader System** - Quality content warnings and suggestions
- ✅ **Privacy-First Design** - Metadata-only logging, no content storage
- ✅ **Comprehensive Testing** - 25+ correctness properties validated

## Architecture

- **Chrome Extension** - TypeScript/React UI with content script injection
- **Supabase Backend** - Edge Functions for AI provider abstraction
- **Property-Based Testing** - Formal correctness validation
- **Monorepo Structure** - Organized packages for extension, shared code, and backend

## Quick Start

### Prerequisites
- Node.js 18+
- Chrome Browser
- Supabase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rudratoshs/linkedln.git
   cd linkedln
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   cd packages/extension
   npm run build
   ```

4. **Load in Chrome**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension/.output/chrome-mv3/`

### Configuration

1. **Set up environment variables**
   ```bash
   cp packages/extension/.env.example packages/extension/.env
   # Add your API keys
   ```

2. **Deploy Supabase functions**
   ```bash
   cd packages/edge-functions
   npx supabase functions deploy
   ```

## Usage

1. Navigate to LinkedIn
2. Look for the PostPhantom panel (top-right corner)
3. Enter your content prompt
4. Click "Generate Posts"
5. Review and select a draft
6. Click "Type into LinkedIn"

## Development

### Project Structure
```
├── packages/
│   ├── extension/          # Chrome extension
│   ├── shared/            # Shared utilities
│   └── edge-functions/    # Supabase backend
├── docs/                  # Documentation
└── .kiro/specs/          # Feature specifications
```

### Testing
```bash
# Run all tests
npm test

# Run property-based tests
npm run test:properties
```

### Building
```bash
# Build extension
cd packages/extension && npm run build

# Build shared package
cd packages/shared && npm run build
```

## Deployment

- **Extension**: Load unpacked in Chrome Developer mode
- **Backend**: Deployed to Supabase Edge Functions
- **Database**: PostgreSQL on Supabase

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

PostPhantom is designed with privacy and security in mind:
- No user content is stored
- All interactions require human approval
- Rate limiting prevents abuse
- Metadata-only logging for analytics

## Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ for ethical AI-assisted content creation