import React from 'react'
import { useAppStore } from '../store/app-store'
import { DraftSelectorWithEditor } from './DraftEditor'
import { LoadingIndicator } from './LoadingIndicator'
import { ErrorDisplay } from './ErrorDisplay'
import { ShadowDOMProvider } from './ShadowDOMProvider'
import { PostButtonGuard } from './PostButtonGuard'

export const PostPhantomUI: React.FC = () => {
  const { 
    currentState, 
    isUIVisible, 
    error, 
    isGenerating,
    drafts 
  } = useAppStore()

  return (
    <>
      {/* Always render PostButtonGuard to prevent automatic posting */}
      <PostButtonGuard />
      
      {isUIVisible && (
        <ShadowDOMProvider>
          <div className="postphantom-ui bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-md postphantom-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">PostPhantom</h3>
              <div className="text-xs text-gray-500 capitalize">{currentState}</div>
            </div>
            
            {error && <ErrorDisplay error={error} />}
            
            {isGenerating && <LoadingIndicator message="Thinking..." />}
            
            {(currentState === 'review' || currentState === 'drafting') && drafts.length > 0 && (
              <DraftSelectorWithEditor drafts={drafts} />
            )}
            
            {currentState === 'idle' && (
              <div className="text-sm text-gray-600">
                Click on a LinkedIn post input to get started
              </div>
            )}
            
            {currentState === 'scanning' && (
              <div className="text-sm text-gray-600">
                Analyzing context...
              </div>
            )}
            
            {currentState === 'drafting' && drafts.length === 0 && (
              <div className="text-sm text-gray-600">
                Generating drafts...
              </div>
            )}
            
            {currentState === 'typing' && (
              <div className="text-sm text-green-600">
                Ready to type - human approval confirmed
              </div>
            )}
          </div>
        </ShadowDOMProvider>
      )}
    </>
  )
}