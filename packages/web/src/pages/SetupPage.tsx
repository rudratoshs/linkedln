/**
 * Setup page for database initialization
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Database, Terminal, CheckCircle } from 'lucide-react'

export function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Database Setup Required</CardTitle>
          <p className="text-muted-foreground">
            The PostPhantom database tables need to be created before you can use the dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Database Tables Missing</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The required database tables haven't been created in your Supabase project yet.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center space-x-2">
              <Terminal className="h-4 w-4" />
              <span>Setup Instructions</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Install Supabase CLI</h4>
                  <p className="text-sm text-muted-foreground">
                    Install the Supabase CLI to manage your database:
                  </p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
                    npm install -g supabase
                  </code>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Login to Supabase</h4>
                  <p className="text-sm text-muted-foreground">
                    Authenticate with your Supabase account:
                  </p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
                    supabase login
                  </code>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Link Your Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Navigate to the edge-functions directory and link your project:
                  </p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
                    cd packages/edge-functions<br />
                    supabase link --project-ref livddfovoslptifnbfek
                  </code>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium">Run Database Migrations</h4>
                  <p className="text-sm text-muted-foreground">
                    Apply the PostPhantom database schema:
                  </p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded text-sm">
                    supabase db push
                  </code>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">Refresh the Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Once the migrations are complete, refresh this page to access the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Quick Setup: Run SQL Manually</h4>
            <p className="text-sm text-blue-700 mb-3">
              For a quick setup, you can run the provided SQL file in your Supabase dashboard:
            </p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase project dashboard</a></li>
              <li>Navigate to the SQL Editor</li>
              <li>Copy and paste the contents of <code>packages/web/setup-database.sql</code></li>
              <li>Click "Run" to create all required tables</li>
              <li>Refresh this page once complete</li>
            </ol>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={() => window.location.reload()} 
              className="flex-1"
            >
              Refresh Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              className="flex-1"
            >
              Open Supabase Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}