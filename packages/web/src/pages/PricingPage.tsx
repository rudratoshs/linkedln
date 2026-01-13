/**
 * Pricing page with billing and subscription UI
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Check, ExternalLink, CreditCard, Calendar } from 'lucide-react'

// Mock subscription data - in real implementation would come from database
interface SubscriptionPlan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  current: boolean
  popular?: boolean
}

interface BillingInfo {
  currentPlan: string
  nextBillingDate?: string
  monthlySpend: number
  usageThisMonth: number
  usageLimit: number
}

export function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)

  // Mock data - in real implementation would fetch from database
  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '50 generations per day',
        'Basic AI providers (OpenAI, Gemini)',
        'Standard typing simulation',
        'Community support',
        'Basic personas (up to 3)'
      ],
      current: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19,
      period: 'per month',
      description: 'For power users and professionals',
      features: [
        '500 generations per day',
        'All AI providers with priority routing',
        'Advanced personas (unlimited)',
        'Priority support',
        'Analytics dashboard',
        'Custom typing patterns',
        'Export/import settings'
      ],
      current: false,
      popular: true
    },
    {
      id: 'team',
      name: 'Team',
      price: 49,
      period: 'per month',
      description: 'For teams and organizations',
      features: [
        'Unlimited generations',
        'Team management dashboard',
        'Shared personas library',
        'Advanced analytics & reporting',
        'API access',
        'Dedicated support',
        'Custom integrations',
        'SSO authentication'
      ],
      current: false
    }
  ]

  const billingInfo: BillingInfo = {
    currentPlan: 'Free',
    nextBillingDate: undefined,
    monthlySpend: 0,
    usageThisMonth: 0,
    usageLimit: 1500
  }

  const handleUpgrade = async (planId: string) => {
    setLoading(true)
    try {
      // Mock upgrade process - in real implementation would integrate with Stripe
      console.log(`Upgrading to plan: ${planId}`)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In real implementation:
      // 1. Create Stripe checkout session
      // 2. Redirect to Stripe checkout
      // 3. Handle webhook for successful payment
      // 4. Update user's subscription in database
      
      alert('Upgrade functionality coming soon! This will integrate with Stripe for secure payments.')
    } catch (error) {
      console.error('Upgrade failed:', error)
      alert('Upgrade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setBillingLoading(true)
    try {
      // Mock billing portal - in real implementation would redirect to Stripe Customer Portal
      console.log('Opening billing portal')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In real implementation:
      // 1. Create Stripe billing portal session
      // 2. Redirect to Stripe portal
      
      alert('Billing portal coming soon! This will integrate with Stripe Customer Portal.')
    } catch (error) {
      console.error('Failed to open billing portal:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setBillingLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Pricing Plans</h1>
        <p className="text-muted-foreground mt-2">
          Choose the plan that works best for you
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.current ? 'border-primary' : ''} ${plan.popular ? 'border-2 border-primary' : ''}`}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.current && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  ${plan.price}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={plan.current ? 'secondary' : plan.popular ? 'primary' : 'outline'}
                disabled={plan.current || loading}
                loading={loading}
                onClick={() => handleUpgrade(plan.id)}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Billing Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Current Plan</span>
                <span className="font-medium">{billingInfo.currentPlan}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Next Billing Date</span>
                <span className="font-medium">
                  {billingInfo.nextBillingDate || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Monthly Spend</span>
                <span className="font-medium">${billingInfo.monthlySpend.toFixed(2)}</span>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleManageBilling}
                  loading={billingLoading}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Billing
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Usage This Month</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Generations Used</span>
                  <span>{billingInfo.usageThisMonth} / {billingInfo.usageLimit}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${Math.min((billingInfo.usageThisMonth / billingInfo.usageLimit) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Your usage resets on the 1st of each month.</p>
                <p className="mt-2">
                  Upgrade to Pro for 10x more generations and advanced features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Can I change plans anytime?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate any billing adjustments.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">What happens if I exceed my usage limit?</h4>
              <p className="text-sm text-muted-foreground">
                On the Free plan, you'll be temporarily limited until the next reset. 
                Pro and Team plans have much higher limits to prevent interruptions.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Is my payment information secure?</h4>
              <p className="text-sm text-muted-foreground">
                Yes, all payments are processed securely through Stripe. We never store your 
                payment information on our servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}