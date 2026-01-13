/**
 * History page to view request_logs (read-only analytics)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { useRequestLogs, useRequestLogsSummary, useRateLimit } from '@/hooks/useDatabase'
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react'

export function HistoryPage() {
  const { data: logs, loading: logsLoading, error: logsError, refetch: refetchLogs } = useRequestLogs(50)
  const { data: summary, loading: summaryLoading } = useRequestLogsSummary()
  const { data: rateLimit, loading: rateLimitLoading } = useRateLimit()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  if (logsLoading || summaryLoading || rateLimitLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-muted-foreground">
          View your content generation history and analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rateLimit?.daily_count || 0} / 50
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${Math.min(((rateLimit?.daily_count || 0) / 50) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalRequests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalRequests ? 
                Math.round((summary.successfulRequests / summary.totalRequests) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.successfulRequests || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalTokens?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total consumed
            </p>
          </CardContent>
        </Card>
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(summary.providerUsage).map(([provider, count]) => (
                <div key={provider} className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      provider === 'openai' ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <span className="capitalize">{provider}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{count} requests</div>
                    <div className="text-xs text-muted-foreground">
                      {summary.totalRequests ? Math.round((count / summary.totalRequests) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Requests</CardTitle>
            {logsError && (
              <Button variant="outline" size="sm" onClick={refetchLogs}>
                Retry
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logsError ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Error loading request logs: {logsError}</p>
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium capitalize">
                        {log.request_type}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {log.provider} • {log.model_name}
                    </div>
                    {log.used_vision && (
                      <div className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        <Zap className="h-3 w-3" />
                        <span>Vision</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {log.actual_tokens ? `${log.actual_tokens.toLocaleString()} tokens` : 'N/A'}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(log.response_time_ms)}</span>
                      <span>•</span>
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No requests found. Start using the extension to see your history here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}