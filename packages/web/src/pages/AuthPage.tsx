/**
 * Authentication page with login and signup forms
 */

import React, { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function AuthPage() {
  const { signIn, signUp, error } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)

    try {
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)

      if (result.error) {
        setAuthError(result.error.message)
      }
    } catch (err) {
      setAuthError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <p className="text-muted-foreground">
            {isSignUp 
              ? 'Sign up for PostPhantom Dashboard' 
              : 'Sign in to your PostPhantom account'
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {(authError || error) && (
              <div className="text-sm text-destructive">
                {authError || error?.message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"
              }
            </button>
          </div>

          {isSignUp && (
            <div className="mt-4 text-xs text-muted-foreground text-center">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700">
            <strong>Demo credentials:</strong><br />
            Email: demo@postphantom.com<br />
            Password: demopassword123
          </div>
        </CardContent>
      </Card>
    </div>
  )
}