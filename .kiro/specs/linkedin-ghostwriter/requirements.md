# Requirements Document

## Introduction

PostPhantom is a LinkedIn content assistance system that provides AI-powered draft generation while maintaining strict human-in-the-loop governance. The system operates as a Chrome extension with Supabase Edge Functions backend, supporting multiple AI providers (OpenAI and Gemini) with consistent embedding and moderation strategies.

**CRITICAL IMPLEMENTATION REQUIREMENT:** All third-party services (OpenAI API, Gemini API, Supabase, etc.) MUST use real accounts with actual credentials. No dummy data, mocking, or assumptions are permitted. Real API keys and production-ready configurations are required from the start.

## Glossary

- **PostPhantom**: The complete AI-powered LinkedIn content assistance system
- **Chrome_Extension**: The client-side component that injects UI and captures user interactions
- **Edge_Functions**: The Supabase-hosted backend that processes AI requests
- **Provider_Abstraction_Layer**: The interface that abstracts AI provider implementations
- **Human_in_the_Loop**: Mandatory user review and approval before any content posting
- **Shadow_DOM**: Isolated DOM tree for UI injection that doesn't interfere with LinkedIn's styling
- **Golden_Hour_Scanning**: Passive content analysis during user browsing
- **Circuit_Breaker**: Health monitoring system that routes traffic away from unhealthy providers

## Requirements

### Requirement 1: AI Content Generation

**User Story:** As a LinkedIn user, I want AI-generated content drafts for my posts and comments, so that I can create engaging content more efficiently.

#### Acceptance Criteria

1. WHEN a user requests content generation, THE PostPhantom SHALL generate relevant drafts using the selected AI provider
2. WHEN generating content, THE PostPhantom SHALL support both text-only and vision-enabled requests
3. WHEN content exceeds 110k estimated tokens, THE PostPhantom SHALL automatically route to Gemini 1.5 Pro
4. WHEN video input is present and supported by the client, THE PostPhantom SHALL route to Gemini 1.5 Pro Vision
5. THE PostPhantom SHALL provide multiple draft variations for user selection

### Requirement 2: Multi-Provider Support

**User Story:** As a system administrator, I want robust multi-provider AI support, so that the system remains available even when individual providers experience issues.

#### Acceptance Criteria

1. THE PostPhantom SHALL support both OpenAI GPT-4o and Google Gemini 1.5 Pro for text generation
2. THE PostPhantom SHALL support both OpenAI GPT-4o Vision and Google Gemini 1.5 Pro Vision for image analysis
3. WHEN the primary provider fails, THE PostPhantom SHALL automatically failover to the secondary provider
4. WHEN a provider is marked unhealthy, THE PostPhantom SHALL route future requests to healthy providers
5. THE PostPhantom SHALL use OpenAI text-embedding-3-small exclusively for all embeddings

### Requirement 3: Content Moderation

**User Story:** As a compliance officer, I want all generated content to be moderated for safety, so that inappropriate content is prevented from being suggested to users.

#### Acceptance Criteria

1. WHEN using OpenAI as the provider, THE PostPhantom SHALL apply OpenAI Moderation API
2. WHEN using Gemini as the provider, THE PostPhantom SHALL apply Gemini Safety Settings with BLOCK_ONLY_HIGH threshold
3. THE PostPhantom SHALL perform exactly one provider-appropriate safety enforcement per request
4. WHEN content fails moderation, THE PostPhantom SHALL reject the request and provide appropriate feedback
5. THE PostPhantom SHALL log moderation metadata (timestamps, provider, decision outcome, safety category) for audit purposes, without storing user content or generated text

### Requirement 4: Chrome Extension Integration

**User Story:** As a LinkedIn user, I want seamless integration with LinkedIn's interface, so that I can access AI assistance without disrupting my normal workflow.

#### Acceptance Criteria

1. THE Chrome_Extension SHALL inject UI elements using Shadow DOM to avoid styling conflicts
2. WHEN LinkedIn's SPA rerenders content, THE Chrome_Extension SHALL detect changes using MutationObserver
3. THE Chrome_Extension SHALL comply with Manifest V3 requirements
4. WHEN injecting UI, THE Chrome_Extension SHALL maintain LinkedIn's visual design consistency
5. THE Chrome_Extension SHALL provide tooltips and popovers that render within the Shadow DOM

### Requirement 5: Human-in-the-Loop Governance

**User Story:** As a LinkedIn user, I want complete control over what content gets posted, so that I maintain responsibility for my professional communications.

#### Acceptance Criteria

1. THE PostPhantom SHALL require explicit user selection of generated drafts
2. THE PostPhantom SHALL allow users to edit selected drafts before posting
3. THE Chrome_Extension SHALL never automatically click the Post button
4. WHEN a user attempts to post generic positive content, THE PostPhantom SHALL display anti-cheerleader warnings
5. THE PostPhantom SHALL enforce a state machine: Idle → Scanning → Drafting → Review → Typing

### Requirement 6: Rate Limiting and Ethics

**User Story:** As a platform administrator, I want usage limits and ethical constraints, so that the system promotes authentic engagement rather than spam.

#### Acceptance Criteria

1. THE PostPhantom SHALL limit users to 50 generations per day
2. THE PostPhantom SHALL enforce a 2-minute cooldown between requests
3. WHEN a user exceeds 10 requests per hour, THE PostPhantom SHALL impose a 30-minute lock
4. THE PostPhantom SHALL prohibit automatic likes, bulk actions, and data export scraping
5. THE PostPhantom SHALL log metadata (timestamps, provider, decision outcome, safety category) for compliance monitoring, without storing user content or generated text

### Requirement 7: Typing Simulation

**User Story:** As a LinkedIn user, I want natural typing behavior when content is inserted, so that my activity appears authentic and human-like.

#### Acceptance Criteria

1. WHEN inserting generated content, THE Chrome_Extension SHALL simulate human typing patterns
2. THE Chrome_Extension SHALL apply Gaussian jitter to typing intervals
3. THE Chrome_Extension SHALL enforce realistic dwell times between keystrokes
4. THE Chrome_Extension SHALL use WindMouse algorithm for cursor movement simulation
5. THE Chrome_Extension SHALL make typing speed variations appear natural

### Requirement 8: Data Persistence

**User Story:** As a system user, I want my preferences and interaction history stored securely, so that the system can provide personalized assistance over time.

#### Acceptance Criteria

1. THE PostPhantom SHALL store user preferences in PostgreSQL (JSONB), and embeddings using the pgvector extension
2. THE PostPhantom SHALL maintain embeddings for content similarity analysis
3. THE PostPhantom SHALL log all AI requests with provider and safety rating information
4. THE PostPhantom SHALL store AI model registry with capabilities and status
5. THE PostPhantom SHALL use Supabase authentication for secure data access

### Requirement 9: Provider Abstraction

**User Story:** As a developer, I want a consistent interface for AI providers, so that adding new providers or switching between them requires minimal code changes.

#### Acceptance Criteria

1. THE Provider_Abstraction_Layer SHALL implement a common IGenerativeModel interface
2. THE Provider_Abstraction_Layer SHALL handle provider-specific message format conversions
3. WHEN using Gemini, THE Provider_Abstraction_Layer SHALL map SystemMessage to systemInstruction
4. WHEN processing images, THE Provider_Abstraction_Layer SHALL enforce 10MB size limits
5. THE Provider_Abstraction_Layer SHALL never expose provider SDKs directly to application code

### Requirement 10: Performance and Reliability

**User Story:** As a LinkedIn user, I want fast and reliable AI assistance, so that my content creation workflow remains efficient.

#### Acceptance Criteria

1. THE Edge_Functions SHALL respond to generation requests within reasonable time limits
2. WHEN processing large contexts, THE PostPhantom SHALL display "Thinking..." UI feedback
3. THE PostPhantom SHALL implement circuit breaker patterns for provider health monitoring
4. WHEN a provider becomes unhealthy, THE PostPhantom SHALL automatically recover after cooldown periods
5. THE PostPhantom SHALL maintain request logs for performance analysis and debugging