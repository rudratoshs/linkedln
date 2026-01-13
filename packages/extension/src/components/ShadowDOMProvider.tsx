import React, { createContext, useContext, useRef, useEffect } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import * as Popover from '@radix-ui/react-popover'

interface ShadowDOMContextValue {
  shadowRoot: ShadowRoot | null
  container: HTMLElement | null
}

const ShadowDOMContext = createContext<ShadowDOMContextValue>({
  shadowRoot: null,
  container: null
})

export const useShadowDOM = () => useContext(ShadowDOMContext)

interface ShadowDOMProviderProps {
  children: React.ReactNode
}

export const ShadowDOMProvider: React.FC<ShadowDOMProviderProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const shadowRootRef = useRef<ShadowRoot | null>(null)

  useEffect(() => {
    // Find the shadow root by traversing up from the container
    if (containerRef.current) {
      let current = containerRef.current.parentNode
      while (current && current.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
        current = current.parentNode
      }
      if (current && current.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        shadowRootRef.current = current as ShadowRoot
      }
    }
  }, [])

  const contextValue: ShadowDOMContextValue = {
    shadowRoot: shadowRootRef.current,
    container: containerRef.current
  }

  return (
    <div ref={containerRef} className="postphantom-shadow-provider">
      <ShadowDOMContext.Provider value={contextValue}>
        <Tooltip.Provider>
          {children}
        </Tooltip.Provider>
      </ShadowDOMContext.Provider>
    </div>
  )
}

// Custom Tooltip component that renders within Shadow DOM
interface ShadowTooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export const ShadowTooltip: React.FC<ShadowTooltipProps> = ({ 
  content, 
  children, 
  side = 'top' 
}) => {
  const { shadowRoot } = useShadowDOM()

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal container={shadowRoot}>
        <Tooltip.Content
          side={side}
          className="postphantom-tooltip bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-50"
          sideOffset={4}
        >
          {content}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

// Custom Popover component that renders within Shadow DOM
interface ShadowPopoverProps {
  trigger: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

export const ShadowPopover: React.FC<ShadowPopoverProps> = ({
  trigger,
  content,
  side = 'bottom',
  align = 'start'
}) => {
  const { shadowRoot } = useShadowDOM()

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        {trigger}
      </Popover.Trigger>
      <Popover.Portal container={shadowRoot}>
        <Popover.Content
          side={side}
          align={align}
          className="postphantom-popover bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm"
          sideOffset={4}
        >
          {content}
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}