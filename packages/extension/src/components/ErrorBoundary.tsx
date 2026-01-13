/**
 * Error Boundary Component for PostPhantom
 * Catches and handles React errors gracefully
 * Requirements: 4.4, 10.1
 */

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PostPhantom Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Log error for debugging
    this.logError(error, errorInfo)
  }

  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    console.error('PostPhantom Error Report:', errorReport)
    
    // In a real implementation, this could be sent to an error tracking service
    // For now, we'll store it in local storage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('postphantom_errors') || '[]')
      existingErrors.push(errorReport)
      
      // Keep only the last 10 errors
      const recentErrors = existingErrors.slice(-10)
      localStorage.setItem('postphantom_errors', JSON.stringify(recentErrors))
    } catch (storageError) {
      console.warn('Failed to store error report:', storageError)
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>PostPhantom encountered an unexpected error and needs to restart.</p>
            
            <div className="error-details">
              <details>
                <summary>Error Details</summary>
                <div className="error-info">
                  <p><strong>Error:</strong> {this.state.error?.message}</p>
                  {this.state.error?.stack && (
                    <pre className="error-stack">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            </div>

            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-button">
                Try Again
              </button>
              <button onClick={this.handleReload} className="reload-button">
                Reload Extension
              </button>
            </div>

            <div className="error-help">
              <p className="help-text">
                If this problem persists, try refreshing the page or disabling and re-enabling the extension.
              </p>
            </div>
          </div>

          <style>{`
            .error-boundary {
              padding: 20px;
              background: #fef2f2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              max-width: 400px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .error-content {
              text-align: center;
            }

            .error-icon {
              font-size: 48px;
              margin-bottom: 16px;
            }

            .error-content h3 {
              color: #dc2626;
              margin: 0 0 8px 0;
              font-size: 18px;
              font-weight: 600;
            }

            .error-content p {
              color: #7f1d1d;
              margin: 0 0 16px 0;
              font-size: 14px;
              line-height: 1.5;
            }

            .error-details {
              margin: 16px 0;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              color: #dc2626;
              font-weight: 500;
              font-size: 12px;
              margin-bottom: 8px;
            }

            .error-info {
              background: #fff;
              border: 1px solid #fecaca;
              border-radius: 4px;
              padding: 12px;
              margin-top: 8px;
            }

            .error-info p {
              margin: 0 0 8px 0;
              font-size: 12px;
              color: #374151;
            }

            .error-stack {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              padding: 8px;
              font-size: 10px;
              color: #6b7280;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-all;
              max-height: 120px;
              overflow-y: auto;
            }

            .error-actions {
              display: flex;
              gap: 8px;
              justify-content: center;
              margin: 16px 0;
            }

            .retry-button,
            .reload-button {
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

            .reload-button {
              background: #6b7280;
              color: white;
            }

            .reload-button:hover {
              background: #4b5563;
            }

            .error-help {
              border-top: 1px solid #fecaca;
              padding-top: 12px;
              margin-top: 16px;
            }

            .help-text {
              font-size: 11px;
              color: #7f1d1d;
              margin: 0;
              line-height: 1.4;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook to get error boundary state
 */
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error('PostPhantom Error:', error)
    
    // You could dispatch to a global error state here
    // or show a toast notification
  }

  return { handleError }
}