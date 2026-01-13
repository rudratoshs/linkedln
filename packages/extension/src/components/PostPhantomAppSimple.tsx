/**
 * Simplified PostPhantom React Application Component
 * Self-contained with local state management
 */

import React, { useEffect, useState } from 'react'

interface Draft {
  id: string
  content: string
  provider: string
}

interface PostPhantomAppProps {
  onClose?: () => void
}

export const PostPhantomApp: React.FC<PostPhantomAppProps> = ({ onClose }) => {
  // Local state management
  const [isGenerating, setIsGenerating] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentState, setCurrentState] = useState<'idle' | 'generating' | 'review' | 'typing'>('idle')
  const [prompt, setPrompt] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Mock integration service for now
  const mockGenerateContent = async (prompt: string) => {
    setIsGenerating(true)
    setCurrentState('generating')
    setError(null)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const mockDrafts: Draft[] = [
      {
        id: '1',
        content: `🚀 ${prompt}\n\nExcited to share some thoughts on this topic. What's your experience been like?\n\n#Innovation #Growth`,
        provider: 'mock'
      },
      {
        id: '2',
        content: `Reflecting on ${prompt.toLowerCase()}...\n\nThis is such an important area. I'd love to hear different perspectives from the community.\n\nWhat are your thoughts?`,
        provider: 'mock'
      },
      {
        id: '3',
        content: `${prompt}\n\nJust had some insights on this that I wanted to share. Looking forward to the discussion!\n\nDrop your thoughts in the comments 👇`,
        provider: 'mock'
      }
    ]
    
    setDrafts(mockDrafts)
    setIsGenerating(false)
    setCurrentState('review')
  }

  const mockTypeDraft = async (content: string) => {
    setIsGenerating(true)
    setCurrentState('typing')
    
    // Find LinkedIn text area and type content
    const selectors = [
      '.ql-editor[contenteditable="true"]',
      '[data-placeholder="What do you want to talk about?"]',
      '[aria-label="Text editor for creating content"]'
    ]

    let textArea: HTMLElement | null = null
    
    for (const selector of selectors) {
      textArea = document.querySelector(selector)
      if (textArea) break
    }

    if (textArea) {
      textArea.focus()
      
      if (textArea.contentEditable === 'true') {
        textArea.innerHTML = ''
        textArea.textContent = content
      } else {
        ;(textArea as HTMLInputElement).value = content
      }

      // Trigger events
      textArea.dispatchEvent(new Event('input', { bubbles: true }))
      textArea.dispatchEvent(new Event('change', { bubbles: true }))
    }
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setIsGenerating(false)
    setCurrentState('idle')
    setShowSuccess(true)
  }

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
    await mockGenerateContent(prompt.trim())
  }

  const handleSelectDraft = (draft: Draft) => {
    setSelectedDraft(draft)
  }

  const handleTypeDraft = async () => {
    if (!selectedDraft) return

    try {
      await mockTypeDraft(selectedDraft.content)
      setPrompt('')
      setDrafts([])
      setSelectedDraft(null)
      setShowSuccess(true)
    } catch (error) {
      console.error('Failed to type draft:', error)
      setError(error instanceof Error ? error.message : 'Failed to type draft')
    }
  }

  const handleComplete = () => {
    setPrompt('')
    setDrafts([])
    setSelectedDraft(null)
    setError(null)
    setShowSuccess(false)
    setCurrentState('idle')
    onClose?.()
  }

  const handleEditDraft = (newContent: string) => {
    if (selectedDraft) {
      const updatedDraft = { ...selectedDraft, content: newContent }
      setSelectedDraft(updatedDraft)
      setDrafts(drafts.map(d => d.id === selectedDraft.id ? updatedDraft : d))
    }
  }

  return (
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
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
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
            <div className="warning-message">
              ⚠️ Consider avoiding generic positive words for more authentic engagement
              <button onClick={() => setShowWarning(false)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
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

      {isGenerating && currentState === 'generating' && (
        <div className="generating-state">
          <div className="thinking-indicator">
            🤔 Crafting your LinkedIn post...
          </div>
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
                  onClick={() => setSelectedDraft(null)}
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
          <div className="typing-indicator">
            ⌨️ Typing your post into LinkedIn...
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="completion-state">
          <div className="success-message">
            <h3>✅ Post typed successfully!</h3>
            <p>Your LinkedIn post has been typed into the text area. You can now review and publish it.</p>
            <button onClick={handleComplete} className="done-button">
              Done
            </button>
          </div>
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

        .error-message, .warning-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 15px;
          position: relative;
        }

        .warning-message {
          background: #fff3cd;
          border-color: #ffeaa7;
          color: #856404;
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
          box-sizing: border-box;
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

        .thinking-indicator, .typing-indicator {
          text-align: center;
          padding: 20px;
          font-size: 16px;
          color: #666;
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
          box-sizing: border-box;
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
  )
}