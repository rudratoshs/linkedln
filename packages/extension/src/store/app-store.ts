/**
 * Simple App Store for PostPhantom
 * Manages application state without complex dependencies
 */

interface Draft {
  id: string
  content: string
  provider: string
  metadata: any
}

interface AppState {
  isGenerating: boolean
  drafts: Draft[]
  selectedDraft: Draft | null
  error: string | null
  currentState: 'idle' | 'generating' | 'review' | 'typing'
}

// Global state
let appState: AppState = {
  isGenerating: false,
  drafts: [],
  selectedDraft: null,
  error: null,
  currentState: 'idle'
}

// State listeners
const listeners: Array<(state: AppState) => void> = []

// Subscribe to state changes
export function subscribe(listener: (state: AppState) => void) {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
}

// Notify all listeners
function notifyListeners() {
  listeners.forEach(listener => listener({ ...appState }))
}

// State actions
export function setGenerating(isGenerating: boolean) {
  appState.isGenerating = isGenerating
  appState.currentState = isGenerating ? 'generating' : 'idle'
  notifyListeners()
}

export function setDrafts(drafts: Draft[]) {
  appState.drafts = drafts
  appState.currentState = drafts.length > 0 ? 'review' : 'idle'
  notifyListeners()
}

export function selectDraft(draftId: string, explicit: boolean = false) {
  const draft = appState.drafts.find(d => d.id === draftId)
  appState.selectedDraft = draft || null
  notifyListeners()
}

export function updateDraft(draftId: string, content: string) {
  const draft = appState.drafts.find(d => d.id === draftId)
  if (draft) {
    draft.content = content
    if (appState.selectedDraft?.id === draftId) {
      appState.selectedDraft.content = content
    }
    notifyListeners()
  }
}

export function setError(error: string | null) {
  appState.error = error
  notifyListeners()
}

export function clearError() {
  appState.error = null
  notifyListeners()
}

export function clearDrafts() {
  appState.drafts = []
  appState.selectedDraft = null
  appState.currentState = 'idle'
  notifyListeners()
}

export function getCurrentState() {
  return { ...appState }
}

// React-like hook for components
export function useAppStore() {
  return {
    ...appState,
    selectDraft,
    updateDraft,
    clearDrafts,
    setError,
    clearError
  }
}