/**
 * Voice Vault page for managing personas (CRUD operations)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export function VoiceVaultPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Vault</h1>
          <p className="text-muted-foreground">
            Manage your AI personas and writing styles
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Persona
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Personas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No personas created yet.
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Persona
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}