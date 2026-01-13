import '@testing-library/jest-dom'

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
} as any

// Mock Shadow DOM support with a simpler approach
Object.defineProperty(Element.prototype, 'attachShadow', {
  value: function(options: ShadowRootInit) {
    const shadowRoot = {
      mode: options.mode,
      adoptedStyleSheets: [],
      appendChild: vi.fn(),
      nodeType: Node.DOCUMENT_FRAGMENT_NODE,
      host: this
    } as any
    
    // For closed mode, don't expose shadowRoot property
    if (options.mode === 'open') {
      Object.defineProperty(this, 'shadowRoot', {
        value: shadowRoot,
        writable: false,
        configurable: true
      })
    } else {
      Object.defineProperty(this, 'shadowRoot', {
        value: null,
        writable: false,
        configurable: true
      })
    }
    
    return shadowRoot
  },
  writable: true,
  configurable: true
})

// Mock CSS StyleSheet
global.CSSStyleSheet = class CSSStyleSheet {
  replaceSync = vi.fn()
} as any