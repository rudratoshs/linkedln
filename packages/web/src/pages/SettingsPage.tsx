/**
 * Settings page for user_preferences (syncs with extension)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your preferences and account settings
        </p>
      </div>

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
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="openai">OpenAI (Default)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            
            <Input
              type="number"
              label="Generation Temperature"
              placeholder="0.7"
              min="0"
              max="2"
              step="0.1"
            />
            
            <Input
              type="number"
              label="Max Drafts per Request"
              placeholder="3"
              min="1"
              max="5"
            />
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anti-cheerleader"
                className="rounded border-input"
                defaultChecked
              />
              <label htmlFor="anti-cheerleader" className="text-sm">
                Enable anti-cheerleader warnings
              </label>
            </div>
            
            <Button>Save AI Preferences</Button>
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
              placeholder="1.0"
              min="0.1"
              max="3.0"
              step="0.1"
            />
            
            <div className="text-sm text-muted-foreground">
              <p>Adjust how fast the extension types generated content.</p>
              <p>1.0 = Normal speed, 0.5 = Half speed, 2.0 = Double speed</p>
            </div>
            
            <Button>Save Typing Settings</Button>
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
              placeholder="your@email.com"
              disabled
            />
            
            <Button variant="outline">Change Password</Button>
            <Button variant="destructive">Delete Account</Button>
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
              <span className="text-sm">Extension connected</span>
            </div>
            
            <Button variant="outline">Force Sync</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}