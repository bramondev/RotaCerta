
import { useState, useEffect, useRef } from 'react';
import { getRandomNotification } from '@/data/notifications';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean>(true);
  const timerRef = useRef<number | null>(null);
  const initialNotificationShown = useRef<boolean>(false);

  const isAuthPage = () => {
    const path = window.location.hash;
    return path.includes('#/login') || path.includes('#/register') || path === '#/';
  };
  
  const isHomePage = () => {
    const path = window.location.hash;
    return path === '#/home';
  };

  const showNotification = () => {
    if (!enabled || isAuthPage() || !isHomePage()) return;
    
    const notification = getRandomNotification();
    
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
      duration: 8000, 
    });
  };

  const startNotificationTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = window.setInterval(() => {
      showNotification();
    }, 25 * 60 * 1000);
  };

  const stopNotificationTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleNotifications = () => {
    const newState = !enabled;
    setEnabled(newState);
    
    localStorage.setItem('notificationsEnabled', newState.toString());
    
    if (newState) {
      startNotificationTimer();
    } else {
      stopNotificationTimer();
    }
  };

  useEffect(() => {
 
    if (isAuthPage()) {
      stopNotificationTimer();
      return;
    }

    const notificationsEnabled = localStorage.getItem('notificationsEnabled');
    if (notificationsEnabled !== null) {
      setEnabled(notificationsEnabled === 'true');
    }
    
    if (!initialNotificationShown.current && isHomePage()) {
      
      const timeout = setTimeout(() => {
        showNotification();
        initialNotificationShown.current = true;
      }, 2000);
      
      if (enabled) {
        startNotificationTimer();
      }
      
      return () => {
        clearTimeout(timeout);
        stopNotificationTimer();
      };
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      if (isAuthPage()) {
        stopNotificationTimer();
      } else if (!isHomePage()) {
        stopNotificationTimer();
      } else if (enabled && !timerRef.current && isHomePage()) {
        startNotificationTimer();
      }
    };

    window.addEventListener('hashchange', handleRouteChange);
    
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, [enabled]);

  return {
    enabled,
    toggleNotifications,
    showNotification, 
  };
}
