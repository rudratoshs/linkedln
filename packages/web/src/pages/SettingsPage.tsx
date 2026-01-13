/**
 * Settings page for user_preferences (syncs with extension)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useDatabase'
import { CheckCircle, AlertCircle } from 'lucide-react'

export function SettingsPage() {
  const { user } = useAuth()
  const { data: preferences, loading, error, refetch } = useUserPreferences()
  const { updatePreferences, loading: updating, error: updateError } = useUpdateUserPreferences()

  const [formData, setFormData] = useState({
    preferred_provider: 'openai' as 'openai' | 'gemini',
    generation_temperature: 0.7,
    max_drafts_per_request: 3,
    anti_cheerleader_enabled: true,
    typing_speed_multiplier: 1.0
  })

  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Update form data when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData({
        preferred_provider: preferences.preferred_provider,
        generation_temperature: preferences.generation_temperature,
        max_drafts_per_request: preferences.max_drafts_per_request,
        anti_cheerleader_enabled: preferences.anti_cheerleader_enabled,
        typing_speed_multiplier: preferences.typing_speed_multiplier
      })
    }
  }, [preferences])

  const handleSaveAIPreferences = async () => {
    try {
      await updatePreferences(formData)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
      refetch()
    } catch (err) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleSaveTypingSettings = async () => {
    try {
      await updatePreferences({
        typing_speed_multiplier: formData.typing_speed_multiplier
      })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
      refetch()
    } catch (err) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and account settings
        </p>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800">Settings saved successfully!</span>
        </div>
      )}

      {(saveStatus === 'error' || error || updateError) && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-800">
            {updateError || error || 'Failed to save settings'}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AI Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Preferred AI Provider
              </label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.preferred_provider}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  preferred_provider: e.target.value as 'openai' | 'gemini' 
                })}
              >
                <option value="openai">OpenAI (Default)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            
            <Input
              type="number"
              label="Generation Temperature"
              value={formData.generation_temperature}
              onChange={(e) => setFormData({ 
                ...formData, 
                generation_temperature: parseFloat(e.target.value) || 0.7 
              })}
              min="0"
              max="2"
              step="0.1"
            />
            
            <Input
              type="number"
              label="Max Drafts per Request"
              value={formData.max_drafts_per_request}
              onChange={(e) => setFormData({ 
                ...formData, 
                max_drafts_per_request: parseInt(e.target.value) || 3 
              })}
              min="1"
              max="5"
            />
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anti-cheerleader"
                className="rounded border-input"
                checked={formData.anti_cheerleader_enabled}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  anti_cheerleader_enabled: e.target.checked 
                })}
              />
              <label htmlFor="anti-cheerleader" className="text-sm">
                Enable anti-cheerleader warnings
              </label>
            </div>
            
            <Button onClick={handleSaveAIPreferences} loading={updating}>
              Save AI Preferences
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typing Simulation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="number"
              label="Typing Speed Multiplier"
              value={formData.typing_speed_multiplier}
              onChange={(e) => setFormData({ 
                ...formData, 
                typing_speed_multiplier: parseFloat(e.target.value) || 1.0 
              })}
              min="0.1"
              max="3.0"
              step="0.1"
            />
            
            <div className="text-sm text-muted-foreground">
              <p>Adjust how fast the extension types generated content.</p>
              <p>1.0 = Normal speed, 0.5 = Half speed, 2.0 = Double speed</p>
            </div>
            
            <Button onClick={handleSaveTypingSettings} loading={updating}>
              Save Typing Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              label="Email Address"
              value={user?.email || ''}
              disabled
            />
            
            <Button variant="outline" disabled>
              Change Password
            </Button>
            <Button variant="destructive" disabled>
              Delete Account
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Account management features coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Extension Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your settings automatically sync with the PostPhantom browser extension.
            </p>
            
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Settings ready for sync</span>
            </div>
            
            <Button variant="outline" onClick={refetch}>
              Refresh Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}