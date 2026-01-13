# Implementation Plan: PostPhantom

## Overview

This implementation plan converts the PostPhantom design into a series of incremental coding tasks. The approach follows a monorepo structure with Chrome Extension (client) and Supabase Edge Functions (server), implementing the Provider Abstraction Layer for multi-AI provider support while maintaining strict human-in-the-loop governance.

**CRITICAL IMPLEMENTATION REQUIREMENT:** All third-party services (OpenAI API, Gemini API, Supabase, etc.) MUST use real accounts with actual credentials. No dummy data, mocking, or assumptions are permitted. Real API keys and production-ready configurations are required from the start.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - Create monorepo structure with pnpm workspaces
  - Set up WXT Chrome extension framework with Vite 5
  - Configure Supabase Edge Functions with Deno runtime
  - Define core TypeScript interfaces (IGenerativeModel, GenerationRequest, etc.)
  - Set up import_map.json for Deno dependencies via esm.sh
  - _Requirements: 9.1, 9.2_

- [x] 1.1 Write property test for project structure
  - **Property 20: Provider Abstraction Interface Consistency**
  - **Validates: Requirements 9.1, 9.2**

- [x] 2. Implement Provider Abstraction Layer (PAL)
  - [x] 2.1 Create base IGenerativeModel interface and types
    - Implement GenerationRequest/Response interfaces
    - Define ProviderCapabilities interface
    - Create error types for provider failures
    - _Requirements: 9.1_

  - [x] 2.2 Implement OpenAI adapter
    - Create OpenAIAdapter class implementing IGenerativeModel
    - Handle message format conversion for OpenAI API
    - Integrate OpenAI Moderation API
    - Support text generation and vision analysis
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 2.3 Write property tests for OpenAI adapter
    - **Property 4: Provider Capabilities Consistency**
    - **Property 7: Provider-Appropriate Safety Enforcement**
    - **Validates: Requirements 2.1, 3.1**

  - [x] 2.4 Implement Gemini adapter
    - Create GeminiAdapter class implementing IGenerativeModel
    - Map SystemMessage to systemInstruction
    - Apply BLOCK_ONLY_HIGH safety settings
    - Enforce 10MB image size limits
    - Disable embeddings capability
    - _Requirements: 2.1, 2.2, 3.2, 9.3, 9.4_

  - [x] 2.5 Write property tests for Gemini adapter
    - **Property 21: Gemini Message Format Conversion**
    - **Property 22: Image Size Validation**
    - **Validates: Requirements 9.3, 9.4**

- [x] 3. Implement dynamic routing and circuit breaker
  - [x] 3.1 Create ProviderRouter class
    - Implement token estimation heuristic (chars/4)
    - Add routing logic for large contexts (>110k tokens → Gemini)
    - Add video input detection and routing
    - Handle user preferences and provider health
    - _Requirements: 1.3, 1.4_

  - [x] 3.2 Write property tests for routing logic
    - **Property 1: Content Generation Consistency**
    - **Property 3: Multiple Draft Provision**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**

  - [x] 3.3 Implement CircuitBreaker class
    - Track provider health status
    - Implement failover logic with retry
    - Add cooldown and recovery mechanisms
    - Mark unhealthy providers and route around them
    - _Requirements: 2.3, 2.4, 10.3, 10.4_

  - [x] 3.4 Write property tests for circuit breaker
    - **Property 5: Failover Reliability**
    - **Property 24: Circuit Breaker Implementation**
    - **Validates: Requirements 2.3, 2.4, 10.3, 10.4**

- [x] 4. Checkpoint - Ensure core AI infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Supabase Edge Functions
  - [x] 5.1 Create main generation endpoint
    - Set up Supabase Edge Function with Deno
    - Implement request validation using Zod
    - Integrate PAL for provider selection and generation
    - Handle rate limiting and user authentication
    - Return structured generation responses
    - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.3_

  - [x] 5.2 Write property tests for generation endpoint
    - **Property 2: Multi-Modal Input Support**
    - **Property 15: Comprehensive Rate Limiting**
    - **Validates: Requirements 1.2, 6.1, 6.2, 6.3**

  - [x] 5.3 Implement embedding generation endpoint
    - Create dedicated endpoint for embeddings
    - Enforce OpenAI text-embedding-3-small exclusively
    - Store embeddings in PostgreSQL with pgvector
    - _Requirements: 2.5, 8.1, 8.2_

  - [x] 5.4 Write property tests for embeddings
    - **Property 6: Embedding Model Consistency**
    - **Property 18: Comprehensive Data Persistence**
    - **Validates: Requirements 2.5, 8.1, 8.2**

- [x] 6. Implement database schema and data layer
  - [x] 6.1 Create PostgreSQL schema
    - Set up ai_model_registry table
    - Create request_logs table with provider and safety ratings
    - Implement user_preferences table with JSONB
    - Create context_embeddings table with pgvector
    - Add rate_limits table for usage tracking
    - _Requirements: 8.1, 8.3, 8.4_

  - [x] 6.2 Write property tests for data persistence
    - **Property 18: Comprehensive Data Persistence**
    - **Property 25: Metadata-Only Logging**
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [x] 6.3 Implement Supabase authentication integration
    - Set up Supabase Auth for secure data access
    - Create custom ChromeStorageAdapter for extension
    - Implement user session management
    - _Requirements: 8.5_

  - [x] 6.4 Write property tests for authentication
    - **Property 19: Secure Authentication**
    - **Validates: Requirements 8.5**

- [x] 7. Checkpoint - Ensure backend infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Chrome Extension core
  - [x] 8.1 Set up WXT extension structure
    - Configure Manifest V3 with required permissions ✅
    - Set up content script and background service worker ✅
    - Configure React 18 with Tailwind CSS and Radix UI ✅
    - Implement Zustand store for state management ✅
    - _Requirements: 4.3_

  - [x] 8.2 Implement Shadow DOM UI injection
    - Create ShadowDOMInjector class
    - Inject UI elements with isolated styling
    - Ensure tooltips and popovers render within Shadow DOM
    - Implement error recovery for injection failures
    - _Requirements: 4.1, 4.5_

  - [x] 8.3 Write property tests for Shadow DOM injection
    - **Property 9: Shadow DOM UI Isolation**
    - **Validates: Requirements 4.1, 4.5**

  - [x] 8.4 Implement MutationObserver for SPA detection
    - Create SPAObserver class
    - Detect LinkedIn content changes and rerenders
    - Trigger UI re-injection when needed
    - _Requirements: 4.2_

  - [x] 8.5 Write property tests for SPA detection
    - **Property 10: SPA Change Detection**
    - **Validates: Requirements 4.2**

- [x] 9. Implement human-in-the-loop governance
  - [x] 9.1 Create state machine implementation
    - Implement Idle → Scanning → Drafting → Review → Typing states
    - Enforce explicit user selection of drafts
    - Prevent automatic posting or Post button clicking
    - _Requirements: 5.1, 5.3, 5.5_

  - [x] 9.2 Write property tests for state machine
    - **Property 11: Human-in-the-Loop Enforcement**
    - **Property 14: State Machine Compliance**
    - **Validates: Requirements 5.1, 5.3, 5.5**

  - [x] 9.3 Implement draft editing functionality
    - Allow users to edit selected drafts before posting
    - Maintain draft state during editing
    - _Requirements: 5.2_

  - [x] 9.4 Write property tests for draft editing
    - **Property 12: Draft Editability**
    - **Validates: Requirements 5.2**

  - [x] 9.5 Implement anti-cheerleader warning system
    - Detect generic positive content patterns
    - Display warnings for low-value engagement
    - _Requirements: 5.4_

  - [x] 9.6 Write property tests for anti-cheerleader warnings
    - **Property 13: Anti-Cheerleader Warning System**
    - **Validates: Requirements 5.4**

- [x] 10. Implement typing simulation
  - [x] 10.1 Create WindMouse typing implementation
    - Implement Gaussian jitter for typing intervals
    - Add realistic dwell times between keystrokes
    - Create natural typing speed variations
    - Use WindMouse algorithm for cursor movement
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 10.2 Write property tests for typing simulation
    - **Property 17: Natural Typing Simulation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 11. Implement rate limiting and ethics enforcement
  - [x] 11.1 Create rate limiting service
    - Enforce 50 generations per day limit
    - Implement 2-minute cooldown between requests
    - Add 30-minute lock after 10 requests per hour
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Write property tests for rate limiting
    - **Property 15: Comprehensive Rate Limiting**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 11.3 Implement prohibited action prevention
    - Block automatic likes, bulk actions, and data scraping
    - Ensure no unauthorized LinkedIn interactions
    - _Requirements: 6.4_

  - [x] 11.4 Write property tests for prohibited actions
    - **Property 16: Prohibited Action Prevention**
    - **Validates: Requirements 6.4**

- [x] 12. Implement error handling and logging
  - [x] 12.1 Create comprehensive error handling
    - Handle provider failures with appropriate user feedback
    - Implement moderation failure responses
    - Add UI feedback for long operations ("Thinking...")
    - _Requirements: 3.4, 10.2_

  - [x] 12.2 Write property tests for error handling
    - **Property 8: Moderation Failure Handling**
    - **Property 23: Long Operation UI Feedback**
    - **Validates: Requirements 3.4, 10.2**

  - [x] 12.3 Implement metadata-only logging
    - Log timestamps, providers, outcomes, safety categories
    - Ensure no user content or generated text is stored
    - _Requirements: 3.5, 6.5, 8.3, 10.5_

  - [x] 12.4 Write property tests for logging
    - **Property 25: Metadata-Only Logging**
    - **Validates: Requirements 3.5, 6.5, 8.3, 10.5**

- [x] 13. Integration and final wiring
  - [x] 13.1 Connect Chrome extension to Supabase backend
    - Integrate Supabase client with custom ChromeStorageAdapter
    - Connect UI components to generation endpoints
    - Wire up authentication and user preferences
    - _Requirements: All integration requirements_

  - [x] 13.2 Write integration tests
    - Test complete generation workflow end-to-end
    - Verify provider failover scenarios
    - Test rate limiting enforcement
    - _Requirements: All integration requirements_

  - [x] 13.3 Implement final UI polish and error states
    - Add loading states and error boundaries
    - Implement user feedback for all error conditions
    - Ensure consistent visual design with LinkedIn
    - _Requirements: 4.4, 10.1_

- [x] 14. Implement Web Dashboard
  - [x] 14.1 Set up Web Application Structure
    - Create `packages/web` using Vite + React + Tailwind (consistent with extension)
    - Configure `pnpm-workspace.yaml` to include the new package
    - Set up Supabase Auth (Login/Signup) reusing `@postphantom/shared` auth logic
    - _Requirements: Shared Auth, Monorepo Structure_

  - [x] 14.2 Implement Dashboard Core Features
    - Create "Voice Vault" page for managing Personas (CRUD operations)
    - Create "History" page to view `request_logs` (read-only analytics)
    - Create "Settings" page for `user_preferences` (syncs with extension)
    - _Requirements: 8.1, 8.3_

  - [x] 14.3 Implement Billing & Subscription UI
    - Create Pricing page
    - Integrate Stripe Customer Portal (or mock for now)
    - Connect to `subscription_plans` table
    - _Requirements: Domain F (Billing Guards)_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation follows TypeScript throughout for type safety
- All AI provider interactions go through the Provider Abstraction Layer
- Human-in-the-loop governance is enforced at every interaction point
- Comprehensive testing ensures correctness from the beginning