
import React, { createContext, useContext } from 'react';
import { useNotifications } from '@/hooks/use-notifications';

interface NotificationsContextType {
  enabled: boolean;
  toggleNotifications: () => void;
  showNotification: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notificationsState = useNotifications();
  
  return (
    <NotificationsContext.Provider value={notificationsState}>
      {children}
    </NotificationsContext.Provider>
  );
};
