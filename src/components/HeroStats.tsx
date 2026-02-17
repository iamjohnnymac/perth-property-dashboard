import { Building2, Waves, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface HeroStatsProps {
  totalProperties: number;
  withPools: number;
  underBudget: number;
  underOffer: number;
  budget: number;
}

export function HeroStats({ totalProperties, withPools, underBudget, underOffer, budget }: HeroStatsProps) {
  const stats = [
    {
      label: 'Properties',
      value: totalProperties,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'With Pools',
      value: withPools,
      icon: Waves,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    },
    {
      label: `Under $${(budget / 1000000).toFixed(2)}M`,
      value: underBudget,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Under Offer',
      value: underOffer,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-0 shadow-md">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
