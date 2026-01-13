import React, { useState, useEffect } from 'react'
import { useAppStore, Draft } from '../store/app-store'
import { ShadowTooltip } from './ShadowDOMProvider'
import { AntiCheerleaderWarning } from './AntiCheerleaderWarning'

interface DraftEditorProps {
  draft: Draft
  onSave: (editedContent: string) => void
  onCancel: () => void
}

/**
 * DraftEditor - Allows users to edit selected drafts before posting
 * Maintains draft state during editing
 * Requirements: 5.2
 */
export const DraftEditor: React.FC<DraftEditorProps> = ({ 
  draft, 
  onSave, 
  onCancel 
}) => {
  const [editedContent, setEditedContent] = useState(draft.content)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(editedContent !== draft.content)
  }, [editedContent, draft.content])

  const handleSave = () => {
    if (editedContent.trim().length === 0) {
      return // Don't save empty content
    }
    onSave(editedContent)
  }

  const handleCancel = () => {
    if (hasChanges) {
      const confirmDiscard = confirm('You have unsaved changes. Are you sure you want to discard them?')
      if (!confirmDiscard) {
        return
      }
    }
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          Edit Draft
        </div>
        <div className="text-xs text-gray-500">
          via {draft.provider}
        </div>
      </div>
      
      <div className="space-y-2">
        <ShadowTooltip 
          content="Edit your draft content. Press Ctrl+Enter to save, Escape to cancel."
          side="top"
        >
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            rows={6}
            placeholder="Edit your draft content..."
            autoFocus
          />
        </ShadowTooltip>
        
        <div className="text-xs text-gray-500">
          {editedContent.length} characters
          {hasChanges && (
            <span className="ml-2 text-amber-600">• Unsaved changes</span>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <ShadowTooltip content="Save changes and continue">
          <button
            onClick={handleSave}
            disabled={!hasChanges || editedContent.trim().length === 0}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Save Changes
          </button>
        </ShadowTooltip>
        
        <ShadowTooltip content="Cancel editing and return to draft selection">
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </ShadowTooltip>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <strong>Tip:</strong> Use Ctrl+Enter to save quickly, or Escape to cancel
      </div>
    </div>
  )
}

/**
 * Enhanced DraftSelector with editing capabilities
 */
export const DraftSelectorWithEditor: React.FC<{ drafts: Draft[] }> = ({ drafts }) => {
  const { 
    selectDraft, 
    selectedDraft, 
    setState, 
    canSelectDraft, 
    canStartTyping,
    preventAutoPosting,
    setDrafts,
    cheerleaderWarning,
    checkForCheerleaderContent,
    showCheerleaderWarning,
    dismissCheerleaderWarning
  } = useAppStore()
  
  const [isEditing, setIsEditing] = useState(false)

  const handleDraftSelect = (draftId: string) => {
    // Enforce human-in-the-loop: explicit user action required
    const success = selectDraft(draftId, true) // true = explicit user action
    if (!success) {
      console.warn('Draft selection failed - human-in-the-loop validation')
    }
  }

  const handleEditDraft = () => {
    if (!selectedDraft) return
    
    // Transition back to drafting state for editing
    setState('drafting', 'User editing selected draft')
    setIsEditing(true)
  }

  const handleSaveEdit = (editedContent: string) => {
    if (!selectedDraft) return
    
    // Update the draft with edited content
    const updatedDrafts = drafts.map(draft => 
      draft.id === selectedDraft.id 
        ? { ...draft, content: editedContent }
        : draft
    )
    
    // Update drafts in store (this will transition back to review state)
    setDrafts(updatedDrafts)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    // Return to review state without changes
    setState('review', 'User cancelled draft editing')
    setIsEditing(false)
  }

  const handleUseSelected = () => {
    if (!selectedDraft) {
      console.warn('Cannot start typing - no draft selected')
      return
    }
    
    // Check for cheerleader content before proceeding
    if (checkForCheerleaderContent(selectedDraft.content)) {
      showCheerleaderWarning(selectedDraft.content)
      return
    }
    
    proceedWithTyping()
  }
  
  const proceedWithTyping = () => {
    // Validate state machine allows typing
    if (!canStartTyping()) {
      console.warn('Cannot start typing - invalid state')
      return
    }
    
    // Ensure we have a selected draft
    if (!selectedDraft) {
      console.warn('Cannot start typing - no draft selected')
      return
    }
    
    // Enforce human-in-the-loop: never auto-post
    if (!preventAutoPosting()) {
      console.error('SECURITY: Auto-posting attempted - blocked by human-in-the-loop governance')
      return
    }
    
    setState('typing', 'User explicitly selected draft for typing')
  }

  const handleCheerleaderDismiss = () => {
    dismissCheerleaderWarning()
    // Return to editing the draft
    handleEditDraft()
  }

  const handleCheerleaderProceed = () => {
    dismissCheerleaderWarning()
    // Proceed with typing despite warning
    proceedWithTyping()
  }

  // Show cheerleader warning if active
  if (cheerleaderWarning?.isVisible) {
    return (
      <AntiCheerleaderWarning
        content={cheerleaderWarning.content}
        onDismiss={handleCheerleaderDismiss}
        onProceed={handleCheerleaderProceed}
      />
    )
  }

  // Show editor if editing
  if (isEditing && selectedDraft) {
    return (
      <DraftEditor
        draft={selectedDraft}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    )
  }

  // Show draft selector
  const canSelect = canSelectDraft()

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        Select a draft to use:
      </div>
      
      {!canSelect && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Draft selection not available in current state
        </div>
      )}
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {drafts.map((draft) => (
          <ShadowTooltip
            key={draft.id}
            content={
              canSelect 
                ? `Generated by ${draft.provider} • Click to select`
                : 'Draft selection disabled'
            }
            side="left"
          >
            <div
              className={`p-3 border rounded transition-colors ${
                !canSelect
                  ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  : draft.selected 
                    ? 'border-blue-500 bg-blue-50 cursor-pointer' 
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
              }`}
              onClick={canSelect ? () => handleDraftSelect(draft.id) : undefined}
            >
              <div className="text-sm text-gray-900 line-clamp-3">
                {draft.content}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                <span>via {draft.provider}</span>
                {checkForCheerleaderContent(draft.content) && (
                  <span className="text-amber-600 text-xs">⚠️ Generic</span>
                )}
              </div>
            </div>
          </ShadowTooltip>
        ))}
      </div>
      
      {selectedDraft && canStartTyping() && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <ShadowTooltip content="Edit this draft before using it">
              <button
                onClick={handleEditDraft}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Edit Draft
              </button>
            </ShadowTooltip>
            
            <ShadowTooltip content="Use draft as-is (human approval required)">
              <button
                onClick={handleUseSelected}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Use As-Is
              </button>
            </ShadowTooltip>
          </div>
          
          {checkForCheerleaderContent(selectedDraft.content) && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-2">
              <span>⚠️</span>
              <span>This content may appear generic. Consider editing for more impact.</span>
            </div>
          )}
        </div>
      )}
      
      {selectedDraft && !canStartTyping() && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Cannot proceed to typing - state machine validation failed
        </div>
      )}
    </div>
  )
}