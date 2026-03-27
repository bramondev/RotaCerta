
import React from 'react';
import { useNotificationsContext } from '@/components/NotificationsProvider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';

export const NotificationsToggle: React.FC = () => {
  const { enabled, toggleNotifications } = useNotificationsContext();
  
  return (
    <div className="flex items-center space-x-2">
      <Bell className="h-4 w-4 text-gray-500" />
      <Label htmlFor="notifications" className="text-sm">Notificações</Label>
      <Switch 
        id="notifications" 
        checked={enabled}
        onCheckedChange={toggleNotifications}
      />
    </div>
  );
};
