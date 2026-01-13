/**
 * Voice Vault page for managing personas (CRUD operations)
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useVoicePersonas, useCreateVoicePersona, useUpdateVoicePersona, useDeleteVoicePersona } from '@/hooks/useDatabase'
import type { VoicePersona } from '@/lib/database'

interface PersonaFormData {
  persona_name: string
  persona_description: string
  tone_attributes: Record<string, any>
  example_phrases: string[]
}

export function VoiceVaultPage() {
  const { data: personas, loading, error, refetch } = useVoicePersonas()
  const { createPersona, loading: creating } = useCreateVoicePersona()
  const { updatePersona, loading: updating } = useUpdateVoicePersona()
  const { deletePersona, loading: deleting } = useDeleteVoicePersona()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPersona, setEditingPersona] = useState<string | null>(null)
  const [formData, setFormData] = useState<PersonaFormData>({
    persona_name: '',
    persona_description: '',
    tone_attributes: {},
    example_phrases: []
  })

  const resetForm = () => {
    setFormData({
      persona_name: '',
      persona_description: '',
      tone_attributes: {},
      example_phrases: []
    })
    setShowCreateForm(false)
    setEditingPersona(null)
  }

  const handleCreate = async () => {
    try {
      await createPersona({
        ...formData,
        is_active: true
      })
      resetForm()
      refetch()
    } catch (err) {
      console.error('Failed to create persona:', err)
    }
  }

  const handleUpdate = async (id: string) => {
    try {
      await updatePersona(id, formData)
      resetForm()
      refetch()
    } catch (err) {
      console.error('Failed to update persona:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this persona?')) {
      try {
        await deletePersona(id)
        refetch()
      } catch (err) {
        console.error('Failed to delete persona:', err)
      }
    }
  }

  const startEdit = (persona: VoicePersona) => {
    setFormData({
      persona_name: persona.persona_name,
      persona_description: persona.persona_description,
      tone_attributes: persona.tone_attributes,
      example_phrases: persona.example_phrases
    })
    setEditingPersona(persona.id)
    setShowCreateForm(false)
  }

  const startCreate = () => {
    resetForm()
    setShowCreateForm(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error loading personas: {error}</p>
        <Button onClick={refetch}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Vault</h1>
          <p className="text-muted-foreground">
            Manage your AI personas and writing styles
          </p>
        </div>
        <Button onClick={startCreate} disabled={showCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Create Persona
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Create New Persona</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Persona Name"
              value={formData.persona_name}
              onChange={(e) => setFormData({ ...formData, persona_name: e.target.value })}
              placeholder="e.g., Professional Thought Leader"
            />
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.persona_description}
                onChange={(e) => setFormData({ ...formData, persona_description: e.target.value })}
                placeholder="Describe the persona's writing style, tone, and characteristics..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Example Phrases (one per line)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.example_phrases.join('\n')}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  example_phrases: e.target.value.split('\n').filter(phrase => phrase.trim()) 
                })}
                placeholder="Example phrases that represent this persona's voice..."
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreate} loading={creating}>
                <Save className="h-4 w-4 mr-2" />
                Create Persona
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personas List */}
      <div className="grid gap-4">
        {personas && personas.length > 0 ? (
          personas.map((persona) => (
            <Card key={persona.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{persona.persona_name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(persona)}
                      disabled={editingPersona === persona.id}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(persona.id)}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingPersona === persona.id ? (
                  <div className="space-y-4">
                    <Input
                      label="Persona Name"
                      value={formData.persona_name}
                      onChange={(e) => setFormData({ ...formData, persona_name: e.target.value })}
                    />
                    <div>
                      <label className="text-sm font-medium mb-2 block">Description</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.persona_description}
                        onChange={(e) => setFormData({ ...formData, persona_description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Example Phrases (one per line)</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.example_phrases.join('\n')}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          example_phrases: e.target.value.split('\n').filter(phrase => phrase.trim()) 
                        })}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={() => handleUpdate(persona.id)} loading={updating}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-muted-foreground">{persona.persona_description}</p>
                    {persona.example_phrases.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Example Phrases:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {persona.example_phrases.slice(0, 3).map((phrase, index) => (
                            <li key={index} className="italic">"{phrase}"</li>
                          ))}
                          {persona.example_phrases.length > 3 && (
                            <li className="text-xs">+{persona.example_phrases.length - 3} more...</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(persona.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Personas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No personas created yet.
                </p>
                <Button variant="outline" onClick={startCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Persona
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}