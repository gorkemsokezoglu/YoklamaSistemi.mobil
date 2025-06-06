import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import NotificationService, { NotificationType } from '../services/NotificationService';

type NotificationContextType = {
  notifications: NotificationType[];
  addNotification: (notification: Omit<NotificationType, 'id' | 'isRead' | 'date'>) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  user: any;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    console.log('NotificationProvider - User changed:', user);
    if (user?.id) {
      console.log('Loading notifications for user:', user.id);
      loadNotifications(user.id);
    } else {
      console.log('No user found, clearing notifications');
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    console.log('NotificationProvider initialized');

    // NotificationService'e context'i bağla
    NotificationService.setNotificationContext({
      addNotification,
      user
    });

    // Uygulama açıkken gelen bildirimleri yakala
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Yeni bildirim alındı:', notification);
      const { title, body, data } = notification.request.content;
      addNotification({
        title: title || 'Bildirim',
        message: body || '',
        type: (data?.type as 'student' | 'academician') || 'student',
        userId: (data?.userId as string) || '',
        relatedId: (data?.relatedId as string) || undefined,
      });
    });

    // Bildirime tıklandığında
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      // Bildirime tıklandığında yapılacak işlemler
    });

    return () => {
      foregroundSubscription.remove();
      backgroundSubscription.remove();
      // Context'i temizle
      NotificationService.setNotificationContext(null);
    };
  }, []);

  const loadNotifications = async (userId: string) => {
    try {
      console.log('Bildirimler yükleniyor - Kullanıcı ID:', userId);
      const stored = await AsyncStorage.getItem(`notifications_${userId}`);
      console.log('AsyncStorage\'dan yüklenen bildirimler:', stored);

      let notificationsToSet: NotificationType[] = [];
      
      if (stored) {
        try {
          const parsedNotifications = JSON.parse(stored);
          console.log('Ayrıştırılan bildirimler:', parsedNotifications);
          
          if (Array.isArray(parsedNotifications)) {
            // Sadece bu kullanıcıya ait bildirimleri filtrele
            notificationsToSet = parsedNotifications.filter(
              notification => {
                const isMatch = notification.userId === userId;
                console.log('Bildirim filtreleme:', {
                  bildirimId: notification.id,
                  bildirimUserId: notification.userId,
                  arananUserId: userId,
                  eslesme: isMatch
                });
                return isMatch;
              }
            );
          } else {
            console.warn('Bildirimler dizi formatında değil:', parsedNotifications);
          }
        } catch (parseError) {
          console.error('Bildirim ayrıştırma hatası:', parseError);
        }
      }

      // Tarihe göre sırala
      const sortedNotifications = notificationsToSet.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      console.log('Ayarlanan bildirimler:', {
        filtrelenmis: notificationsToSet.length,
        siralanmis: sortedNotifications.length
      });
      setNotifications(sortedNotifications);

    } catch (error) {
      console.error('Bildirim yükleme hatası:', error);
      setNotifications([]);
    }
  };

  const saveNotifications = async (notificationsToSave: NotificationType[]) => {
    try {
      if (!user?.id) {
        console.log('No user ID found, skipping notification save');
        return;
      }
      
      // Sadece bu kullanıcıya ait bildirimleri kaydet
      const userNotifications = notificationsToSave.filter(
        notification => notification.userId === user.id
      );
      
      const sortedNotifications = userNotifications.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      await AsyncStorage.setItem(`notifications_${user.id}`, JSON.stringify(sortedNotifications));
      console.log('Saved notifications for user:', user.id, sortedNotifications);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const addNotification = async (notification: Omit<NotificationType, 'id' | 'isRead' | 'date'>) => {
    console.log('Yeni bildirim ekleniyor:', {
      ...notification,
      currentUserId: user?.id,
      currentUserRole: user?.role
    });

    const newNotification: NotificationType = {
      ...notification,
      id: Date.now().toString(),
      isRead: false,
      date: new Date().toISOString(),
    };

    setNotifications(currentNotifications => {
      // Tekrar eden bildirimleri kontrol et
      const isDuplicate = currentNotifications.some(
        n => n.relatedId === newNotification.relatedId && 
             n.title === newNotification.title &&
             n.message === newNotification.message &&
             n.userId === newNotification.userId &&
             // Son 5 dakika içinde eklenmiş mi kontrol et
             (new Date().getTime() - new Date(n.date).getTime()) < 300000
      );

      if (isDuplicate) {
        console.log('Tekrar eden bildirim engellendi:', newNotification);
        return currentNotifications;
      }

      const updatedNotifications = [newNotification, ...currentNotifications];
      console.log('Bildirimler güncellendi:', {
        yeniBildirim: newNotification,
        toplamBildirimSayisi: updatedNotifications.length
      });
      saveNotifications(updatedNotifications);
      return updatedNotifications;
    });
  };

  const markAsRead = (id: string) => {
    if (!user?.id) return;

    setNotifications(currentNotifications => {
      const updatedNotifications = currentNotifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      );
      saveNotifications(updatedNotifications);
      return updatedNotifications;
    });
  };

  const clearAllNotifications = () => {
    if (!user?.id) return;
    
    setNotifications([]);
    saveNotifications([]);
  };

  const value = {
    notifications,
    addNotification,
    markAsRead,
    clearAllNotifications,
    user
  };

  console.log('NotificationProvider value:', { 
    notificationsCount: notifications.length, 
    user: user?.id 
  });

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 