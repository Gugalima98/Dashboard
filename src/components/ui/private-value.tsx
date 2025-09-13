import React from 'react';
import { usePrivacy } from '@/contexts/PrivacyContext';

interface PrivateValueProps {
  value: string | number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const PrivateValue: React.FC<PrivateValueProps> = ({ 
  value, 
  className = '', 
  prefix = '', 
  suffix = '' 
}) => {
  const { isPrivacyMode } = usePrivacy();

  if (isPrivacyMode) {
    // Show asterisks instead of actual value
    const maskedValue = '••••••';
    return (
      <span className={className}>
        {prefix}{maskedValue}{suffix}
      </span>
    );
  }

  return (
    <span className={className}>
      {prefix}{value}{suffix}
    </span>
  );
};
