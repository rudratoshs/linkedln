import React from 'react'
import { useAppStore } from '../store/app-store'

interface ErrorDisplayProps {
  error: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  const { setError } = useAppStore()

  const handleDismiss = () => {
    setError(null)
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
      <div className="flex items-start justify-between">
        <div className="text-sm text-red-700">{error}</div>
        <button
          onClick={handleDismiss}
          className="text-red-400 hover:text-red-600 ml-2"
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    </div>
  )
}