import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface IconBadgeProps {
  icon: LucideIcon;
  iconClassName?: string;
  badgeClassName?: string;
}

const IconBadge: React.FC<IconBadgeProps> = ({ icon: Icon, iconClassName, badgeClassName }) => {
  return (
    <div className={clsx("p-1.5 rounded-lg flex items-center justify-center", badgeClassName)}>
      <Icon className={clsx("w-4 h-4", iconClassName)} />
    </div>
  );
};

export default IconBadge;
