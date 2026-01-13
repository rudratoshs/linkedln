/**
 * Main dashboard page
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardStats } from '@/hooks/useDatabase'
import { Activity, Users, Zap, TrendingUp } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, loading, error } = useDashboardStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.email}
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Error loading dashboard: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const usagePercentage = stats ? Math.min((stats.dailyGenerations / stats.dailyLimit) * 100, 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.email}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.dailyGenerations || 0} / {stats?.dailyLimit || 50}
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  usagePercentage > 80 ? 'bg-red-500' : 
                  usagePercentage > 60 ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {usagePercentage.toFixed(0)}% of daily limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Personas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePersonas || 0}</div>
            <p className="text-xs text-muted-foreground">
              Voice personas created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time generations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">OpenAI</span>
                <div className={`h-2 w-2 rounded-full ${
                  stats?.providerHealth?.openai ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Gemini</span>
                <div className={`h-2 w-2 rounded-full ${
                  stats?.providerHealth?.gemini ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <a 
                href="/voice-vault" 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div>
                  <div className="font-medium">Manage Personas</div>
                  <div className="text-sm text-muted-foreground">Create and edit voice personas</div>
                </div>
                <Users className="h-4 w-4" />
              </a>
              <a 
                href="/history" 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div>
                  <div className="font-medium">View History</div>
                  <div className="text-sm text-muted-foreground">Check your generation history</div>
                </div>
                <Activity className="h-4 w-4" />
              </a>
              <a 
                href="/settings" 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div>
                  <div className="font-medium">Update Settings</div>
                  <div className="text-sm text-muted-foreground">Configure AI preferences</div>
                </div>
                <Zap className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <div className="font-medium">Install Extension</div>
                  <div className="text-sm text-muted-foreground">
                    Install the PostPhantom Chrome extension to start generating content
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <div className="font-medium">Create Personas</div>
                  <div className="text-sm text-muted-foreground">
                    Define your voice personas to match your writing style
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <div className="font-medium">Start Creating</div>
                  <div className="text-sm text-muted-foreground">
                    Use the extension on LinkedIn to generate engaging content
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}