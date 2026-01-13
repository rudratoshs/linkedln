/**
 * Main PostPhantom React Application Component
 * Connects UI to integration service and manages application state
 */

import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/app-store'
import { getIntegrationService, type GenerationRequest } from '../services/integration-service'
import { AntiCheerleaderWarning } from './AntiCheerleaderWarning'
import { ErrorBoundary } from './ErrorBoundary'
import { ThinkingIndicator, TypingIndicator, ErrorState, SuccessState } from './LoadingStates'

interface PostPhantomAppProps {
  onClose?: () => void
}

export const PostPhantomApp: React.FC<PostPhantomAppProps> = ({ onClose }) => {
  const {
    isGenerating,
    drafts,
    selectedDraft,
    error,
    currentState,
    selectDraft,
    updateDraft,
    clearDrafts,
    setError,
    clearError
  } = useAppStore()

  const [prompt, setPrompt] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)
  const integrationService = getIntegrationService()

  // Check authentication status
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const session = await integrationService.sessionManager.getSessionInfo()
        setIsAuthenticated(!!session?.isAuthenticated)
      } catch (error) {
        console.error('Failed to check authentication:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [])

  useEffect(() => {
    // Check for cheerleader content when prompt changes
    if (prompt.length > 10) {
      const hasCheerleaderContent = /\b(amazing|incredible|fantastic|awesome|outstanding)\b/i.test(prompt)
      setShowWarning(hasCheerleaderContent)
    } else {
      setShowWarning(false)
    }
  }, [prompt])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    clearError()
    setRetryCount(0)

    const request: GenerationRequest = {
      prompt: prompt.trim(),
      userPreferences: {
        tone: 'professional',
        length: 'medium',
        provider: 'auto'
      }
    }

    const response = await integrationService.generateContent(request)
    
    if (!response.success) {
      console.error('Generation failed:', response.error)
      // Error is already set by the integration service
    }
  }

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1)
    await handleGenerate()
  }

  const handleSelectDraft = (draft: any) => {
    selectDraft(draft.id, true) // true indicates explicit user action
  }

  const handleTypeDraft = async () => {
    if (!selectedDraft) return

    try {
      await integrationService.typeDraft(selectedDraft.content)
      setPrompt('')
      clearDrafts()
      setShowSuccess(true)
    } catch (error) {
      console.error('Failed to type draft:', error)
      setError(error instanceof Error ? error.message : 'Failed to type draft')
    }
  }

  const handleComplete = () => {
    setPrompt('')
    clearDrafts()
    clearError()
    setShowSuccess(false)
    onClose?.()
  }

  const handleEditDraft = (newContent: string) => {
    if (selectedDraft) {
      updateDraft(selectedDraft.id, newContent)
    }
  }

  if (isLoading) {
    return (
      <div className="postphantom-app">
        <ThinkingIndicator message="Loading PostPhantom" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <div className="postphantom-app">
          <div className="auth-prompt">
            <h3>Welcome to PostPhantom</h3>
            <p>Please sign in to start generating LinkedIn posts.</p>
            <button 
              onClick={() => integrationService.authService.signInWithPassword('', '')}
              className="auth-button"
            >
              Sign in with Email
            </button>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="postphantom-app">
      <div className="app-header">
        <h2>PostPhantom</h2>
        {onClose && (
          <button onClick={onClose} className="close-button">
            ×
          </button>
        )}
      </div>

      {error && (
        <ErrorState
          error={error}
          canRetry={retryCount < 3}
          onRetry={handleRetry}
          onDismiss={clearError}
          suggestions={[
            'Check your internet connection',
            'Try rephrasing your prompt',
            'Wait a moment and try again'
          ]}
        />
      )}

      {currentState === 'idle' && (
        <div className="prompt-input">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What would you like to post about? Describe your topic or share your thoughts..."
            className="prompt-textarea"
            rows={4}
            disabled={isGenerating}
          />
          
          {showWarning && (
            <AntiCheerleaderWarning
              content={prompt}
              onDismiss={() => setShowWarning(false)}
              onProceed={() => setShowWarning(false)}
            />
          )}

          <div className="input-actions">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="generate-button"
            >
              {isGenerating ? 'Generating...' : 'Generate Posts'}
            </button>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="generating-state">
          <ThinkingIndicator 
            message="Crafting your LinkedIn post" 
            estimatedTime={8000}
            showProgress={true}
          />
        </div>
      )}

      {currentState === 'review' && drafts.length > 0 && (
        <div className="drafts-review">
          <h3>Choose your post:</h3>
          <div className="drafts-list">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={`draft-option ${selectedDraft?.id === draft.id ? 'selected' : ''}`}
                onClick={() => handleSelectDraft(draft)}
              >
                <div className="draft-content">
                  {draft.content}
                </div>
                <div className="draft-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectDraft(draft)
                    }}
                    className="select-button"
                  >
                    {selectedDraft?.id === draft.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedDraft && (
            <div className="selected-draft">
              <h4>Selected post:</h4>
              <textarea
                value={selectedDraft.content}
                onChange={(e) => handleEditDraft(e.target.value)}
                className="draft-editor"
                rows={6}
              />
              <div className="draft-actions">
                <button
                  onClick={handleTypeDraft}
                  disabled={isGenerating}
                  className="type-button"
                >
                  {isGenerating ? 'Typing...' : 'Type into LinkedIn'}
                </button>
                <button
                  onClick={() => selectDraft('', false)} // Clear selection
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isGenerating && currentState === 'typing' && (
        <div className="typing-state">
          <TypingIndicator 
            message="Typing your post into LinkedIn"
            showWarning={true}
          />
        </div>
      )}

      {showSuccess && (
        <div className="completion-state">
          <SuccessState
            title="Post typed successfully!"
            message="Your LinkedIn post has been typed into the text area. You can now review and publish it."
            onDone={handleComplete}
            actionLabel="Done"
          />
        </div>
      )}

      <style>{`
        .postphantom-app {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 500px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border: 1px solid #e1e5e9;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e1e5e9;
        }

        .app-header h2 {
          margin: 0;
          color: #0a66c2;
          font-size: 18px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background: #f3f2ef;
          border-radius: 50%;
        }

        .auth-prompt {
          text-align: center;
          padding: 20px;
        }

        .auth-prompt h3 {
          color: #0a66c2;
          margin-bottom: 10px;
        }

        .auth-button {
          background: #0a66c2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 15px;
        }

        .auth-button:hover {
          background: #004182;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
        }

        .prompt-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
        }

        .prompt-textarea:focus {
          outline: none;
          border-color: #0a66c2;
          box-shadow: 0 0 0 2px rgba(10, 102, 194, 0.1);
        }

        .input-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
        }

        .generate-button {
          background: #0a66c2;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }

        .generate-button:hover:not(:disabled) {
          background: #004182;
        }

        .generate-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .drafts-list {
          margin: 15px 0;
        }

        .draft-option {
          border: 1px solid #d0d7de;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .draft-option:hover {
          border-color: #0a66c2;
          background: #f8f9fa;
        }

        .draft-option.selected {
          border-color: #0a66c2;
          background: #f0f8ff;
        }

        .draft-content {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 10px;
          white-space: pre-wrap;
        }

        .draft-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .select-button {
          background: #0a66c2;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 16px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .selected-draft {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .selected-draft h4 {
          margin: 0 0 10px 0;
          color: #0a66c2;
        }

        .draft-editor {
          width: 100%;
          min-height: 120px;
          padding: 12px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
          margin-bottom: 12px;
        }

        .type-button {
          background: #057642;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          margin-right: 10px;
        }

        .type-button:hover:not(:disabled) {
          background: #046c37;
        }

        .type-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .cancel-button {
          background: #666;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        }

        .cancel-button:hover {
          background: #555;
        }

        .typing-note {
          font-size: 12px;
          color: #666;
          text-align: center;
          margin-top: 10px;
        }

        .success-message {
          text-align: center;
          padding: 20px;
        }

        .success-message h3 {
          color: #057642;
          margin-bottom: 10px;
        }

        .done-button {
          background: #0a66c2;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 15px;
        }

        .done-button:hover {
          background: #004182;
        }
      `}</style>
    </div>
    </ErrorBoundary>
  )
}