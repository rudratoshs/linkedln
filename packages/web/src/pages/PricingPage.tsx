/**
 * Pricing page with billing and subscription UI
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Check } from 'lucide-react'

export function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        '50 generations per day',
        'Basic AI providers',
        'Standard typing simulation',
        'Community support'
      ],
      current: true
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      description: 'For power users and professionals',
      features: [
        '500 generations per day',
        'All AI providers',
        'Advanced personas',
        'Priority support',
        'Analytics dashboard',
        'Custom typing patterns'
      ],
      current: false
    },
    {
      name: 'Team',
      price: '$49',
      period: 'per month',
      description: 'For teams and organizations',
      features: [
        'Unlimited generations',
        'Team management',
        'Shared personas',
        'Advanced analytics',
        'API access',
        'Dedicated support'
      ],
      current: false
    }
  ]

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
          <Card key={plan.name} className={plan.current ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.current && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {plan.price}
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
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full" 
                variant={plan.current ? 'secondary' : 'primary'}
                disabled={plan.current}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Current Plan</span>
              <span className="font-medium">Free</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Next Billing Date</span>
              <span className="font-medium">N/A</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Usage This Month</span>
              <span className="font-medium">0 / 1500 generations</span>
            </div>
            
            <div className="pt-4 border-t">
              <Button variant="outline" className="mr-2">
                Manage Billing
              </Button>
              <Button variant="outline">
                Download Invoice
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}