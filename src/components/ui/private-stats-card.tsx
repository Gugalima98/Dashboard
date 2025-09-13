import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PrivateValue } from '@/components/ui/private-value';
import { LucideIcon } from 'lucide-react';

interface PrivateStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const PrivateStatsCard: React.FC<PrivateStatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  prefix = '',
  suffix = '',
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <PrivateValue value={value} prefix={prefix} suffix={suffix} />
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};
