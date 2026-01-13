/**
 * Loading States Component for PostPhantom
 * Provides consistent loading indicators and feedback
 * Requirements: 4.4, 10.1, 10.2
 */

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#0a66c2' 
}) => {
  const sizeMap = {
    small: '16px',
    medium: '24px',
    large: '32px'
  }

  return (
    <div className="loading-spinner" style={{ width: sizeMap[size], height: sizeMap[size] }}>
      <style>{`
        .loading-spinner {
          border: 2px solid #f3f3f3;
          border-top: 2px solid ${color};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

interface ThinkingIndicatorProps {
  message?: string
  estimatedTime?: number
  showProgress?: boolean
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ 
  message = "Thinking...", 
  estimatedTime,
  showProgress = false 
}) => {
  const [dots, setDots] = React.useState('')
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    let progressInterval: NodeJS.Timeout
    if (showProgress && estimatedTime) {
      progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + (100 / (estimatedTime / 100)), 95))
      }, 100)
    }

    return () => {
      clearInterval(dotsInterval)
      if (progressInterval) clearInterval(progressInterval)
    }
  }, [estimatedTime, showProgress])

  return (
    <div className="thinking-indicator">
      <div className="thinking-content">
        <LoadingSpinner size="small" />
        <span className="thinking-text">{message}{dots}</span>
      </div>
      
      {showProgress && estimatedTime && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}

      <style>{`
        .thinking-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e1e5e9;
        }

        .thinking-content {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: ${showProgress ? '12px' : '0'};
        }

        .thinking-text {
          font-size: 14px;
          color: #666;
          font-weight: 500;
          min-width: 80px;
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          max-width: 200px;
        }

        .progress-bar {
          flex: 1;
          height: 4px;
          background: #e1e5e9;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #0a66c2;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 11px;
          color: #666;
          min-width: 30px;
          text-align: right;
        }
      `}</style>
    </div>
  )
}

interface TypingIndicatorProps {
  message?: string
  showWarning?: boolean
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  message = "Typing your post into LinkedIn...",
  showWarning = true 
}) => {
  return (
    <div className="typing-indicator">
      <div className="typing-animation">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
      
      <div className="typing-content">
        <h4>{message}</h4>
        {showWarning && (
          <p className="typing-warning">
            Please don't interact with the page while typing is in progress.
          </p>
        )}
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          background: #f0f8ff;
          border: 1px solid #0a66c2;
          border-radius: 8px;
          text-align: center;
        }

        .typing-animation {
          display: flex;
          gap: 4px;
          margin-bottom: 16px;
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          background: #0a66c2;
          border-radius: 50%;
          animation: typing-bounce 1.4s infinite ease-in-out both;
        }

        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing-bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .typing-content h4 {
          margin: 0 0 8px 0;
          color: #0a66c2;
          font-size: 16px;
          font-weight: 600;
        }

        .typing-warning {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}

interface ErrorStateProps {
  error: string
  canRetry?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  suggestions?: string[]
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  canRetry = false, 
  onRetry, 
  onDismiss,
  suggestions = []
}) => {
  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <div className="error-content">
        <h4>Something went wrong</h4>
        <p className="error-message">{error}</p>
        
        {suggestions.length > 0 && (
          <div className="error-suggestions">
            <p className="suggestions-title">Suggestions:</p>
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="error-actions">
          {canRetry && onRetry && (
            <button onClick={onRetry} className="retry-button">
              Try Again
            </button>
          )}
          {onDismiss && (
            <button onClick={onDismiss} className="dismiss-button">
              Dismiss
            </button>
          )}
        </div>
      </div>

      <style>{`
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          text-align: center;
        }

        .error-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .error-content h4 {
          margin: 0 0 8px 0;
          color: #dc2626;
          font-size: 16px;
          font-weight: 600;
        }

        .error-message {
          margin: 0 0 16px 0;
          color: #7f1d1d;
          font-size: 14px;
          line-height: 1.5;
        }

        .error-suggestions {
          text-align: left;
          margin-bottom: 16px;
          padding: 12px;
          background: #fff;
          border: 1px solid #fecaca;
          border-radius: 6px;
        }

        .suggestions-title {
          margin: 0 0 8px 0;
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
        }

        .error-suggestions ul {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
          color: #7f1d1d;
        }

        .error-suggestions li {
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .error-actions {
          display: flex;
          gap: 8px;
        }

        .retry-button,
        .dismiss-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .retry-button {
          background: #dc2626;
          color: white;
        }

        .retry-button:hover {
          background: #b91c1c;
        }

        .dismiss-button {
          background: #6b7280;
          color: white;
        }

        .dismiss-button:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  )
}

interface SuccessStateProps {
  title?: string
  message?: string
  onDone?: () => void
  actionLabel?: string
}

export const SuccessState: React.FC<SuccessStateProps> = ({ 
  title = "Success!",
  message = "Your action completed successfully.",
  onDone,
  actionLabel = "Done"
}) => {
  return (
    <div className="success-state">
      <div className="success-icon">✅</div>
      <div className="success-content">
        <h4>{title}</h4>
        <p>{message}</p>
        
        {onDone && (
          <button onClick={onDone} className="done-button">
            {actionLabel}
          </button>
        )}
      </div>

      <style>{`
        .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          text-align: center;
        }

        .success-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .success-content h4 {
          margin: 0 0 8px 0;
          color: #057642;
          font-size: 18px;
          font-weight: 600;
        }

        .success-content p {
          margin: 0 0 20px 0;
          color: #166534;
          font-size: 14px;
          line-height: 1.5;
        }

        .done-button {
          background: #057642;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .done-button:hover {
          background: #046c37;
        }
      `}</style>
    </div>
  )
}