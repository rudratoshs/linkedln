/**
 * Basic test for App component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App'

// Mock the auth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null
  })
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    
    // Should show auth page when not authenticated
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
  })
})