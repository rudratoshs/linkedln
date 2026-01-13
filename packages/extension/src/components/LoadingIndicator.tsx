import React from 'react'

interface LoadingIndicatorProps {
  message?: string
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Loading..." 
}) => {
  return (
    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      <span className="text-sm text-blue-700">{message}</span>
    </div>
  )
}