import React from 'react'
import { ShadowTooltip } from './ShadowDOMProvider'

interface AntiCheerleaderWarningProps {
  content: string
  onDismiss: () => void
  onProceed: () => void
}

/**
 * AntiCheerleaderWarning - Detects and warns about generic positive content
 * Displays warnings for low-value engagement patterns
 * Requirements: 5.4
 */
export const AntiCheerleaderWarning: React.FC<AntiCheerleaderWarningProps> = ({
  content,
  onDismiss,
  onProceed
}) => {
  const warnings = detectCheerleaderPatterns(content)

  if (warnings.length === 0) {
    return null
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="text-amber-600 text-lg">⚠️</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">
            Generic Content Detected
          </h4>
          <p className="text-sm text-amber-700 mb-3">
            This content appears to be generic positive engagement that may not add meaningful value to the conversation.
          </p>
          
          <div className="space-y-2">
            <div className="text-xs font-medium text-amber-800">Detected patterns:</div>
            <ul className="text-xs text-amber-700 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-3 p-3 bg-amber-100 rounded text-xs text-amber-800">
            <strong>Suggestion:</strong> Consider adding specific insights, personal experiences, or actionable advice to make your engagement more valuable.
          </div>
        </div>
      </div>
      
      <div className="flex gap-2 pt-2">
        <ShadowTooltip content="Edit the content to make it more specific and valuable">
          <button
            onClick={onDismiss}
            className="flex-1 bg-amber-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Edit Content
          </button>
        </ShadowTooltip>
        
        <ShadowTooltip content="Proceed anyway (not recommended)">
          <button
            onClick={onProceed}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Post Anyway
          </button>
        </ShadowTooltip>
      </div>
    </div>
  )
}

/**
 * Detects generic positive content patterns that indicate low-value engagement
 */
export function detectCheerleaderPatterns(content: string): string[] {
  const warnings: string[] = []
  const lowerContent = content.toLowerCase().trim()
  
  // Generic congratulations without specifics
  const genericCongrats = [
    /^(congrats?|congratulations?)!?$/,
    /^(well done|good job|nice work)!?$/,
    /^(awesome|amazing|fantastic|great)!?$/,
    /^(love this|this is great|so good)!?$/
  ]
  
  for (const pattern of genericCongrats) {
    if (pattern.test(lowerContent)) {
      warnings.push('Generic congratulations without specific context')
      break
    }
  }
  
  // Emoji-only or emoji-heavy responses
  const emojiPattern = /^[\s\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]+$/u
  if (emojiPattern.test(content)) {
    warnings.push('Emoji-only response without meaningful content')
  }
  
  // Generic agreement without adding value
  const genericAgreement = [
    /^(exactly|this|yes|agreed?|totally|absolutely)!?$/,
    /^(so true|couldn't agree more|100%?)!?$/,
    /^(\+1|same here|me too)!?$/
  ]
  
  for (const pattern of genericAgreement) {
    if (pattern.test(lowerContent)) {
      warnings.push('Generic agreement without adding new perspective')
      break
    }
  }
  
  // Vague positive statements
  const vaguePositive = [
    /^(inspiring|motivating|powerful|incredible)!?$/,
    /^(thanks for sharing|great post|nice share)!?$/,
    /^(keep it up|keep going|you got this)!?$/
  ]
  
  for (const pattern of vaguePositive) {
    if (pattern.test(lowerContent)) {
      warnings.push('Vague positive statement without specific feedback')
      break
    }
  }
  
  // Very short responses (less than 10 characters, excluding whitespace)
  if (content.replace(/\s/g, '').length < 10 && content.trim().length > 0) {
    warnings.push('Very short response that may not add substantial value')
  }
  
  // Generic questions without context
  const genericQuestions = [
    /^(how|what|when|where|why)\?$/,
    /^(really|seriously)\?$/,
    /^(thoughts|opinions)\?$/
  ]
  
  for (const pattern of genericQuestions) {
    if (pattern.test(lowerContent)) {
      warnings.push('Generic question without specific context')
      break
    }
  }
  
  // Excessive use of superlatives without substance
  const superlativeCount = (content.match(/\b(amazing|incredible|fantastic|awesome|brilliant|outstanding|perfect|excellent)\b/gi) || []).length
  const wordCount = content.split(/\s+/).length
  
  if (superlativeCount > 0 && wordCount < 15 && superlativeCount / wordCount > 0.3) {
    warnings.push('High ratio of superlatives to content - may appear insincere')
  }
  
  // Generic networking attempts
  const genericNetworking = [
    /^(let's connect|would love to connect|happy to connect)!?$/,
    /^(dm me|send me a message|reach out)!?$/,
    /^(following|followed)!?$/
  ]
  
  for (const pattern of genericNetworking) {
    if (pattern.test(lowerContent)) {
      warnings.push('Generic networking request without context or value proposition')
      break
    }
  }
  
  return warnings
}

/**
 * Checks if content should trigger anti-cheerleader warnings
 */
export function shouldShowCheerleaderWarning(content: string): boolean {
  return detectCheerleaderPatterns(content).length > 0
}

/**
 * Gets a severity score for cheerleader content (0-10, higher = more generic)
 */
export function getCheerleaderSeverity(content: string): number {
  const warnings = detectCheerleaderPatterns(content)
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length
  
  let severity = warnings.length * 2 // Base severity from number of warnings
  
  // Increase severity for very short content
  if (wordCount < 5) {
    severity += 3
  } else if (wordCount < 10) {
    severity += 1
  }
  
  // Increase severity for emoji-only content
  const emojiPattern = /^[\s\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]+$/u
  if (emojiPattern.test(content)) {
    severity += 4
  }
  
  return Math.min(severity, 10) // Cap at 10
}