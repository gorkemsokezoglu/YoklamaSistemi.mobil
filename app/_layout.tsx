import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox, Platform, StatusBar } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// Bildirim hatalarını gizle
LogBox.ignoreLogs([
  'Android Push notifications',
  '`expo-notifications` functionality',
  'Remote notifications',
]);

export default function RootLayout() {
  useEffect(() => {
    // Bildirim izinlerini ve dinleyicileri ayarla
    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('Bildirim izinleri alınamadı');
          return;
        }

        // Bildirim kanallarını oluştur
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Varsayılan',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D4AF37',
          });

          await Notifications.setNotificationChannelAsync('student', {
            name: 'Öğrenci Bildirimleri',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D4AF37',
            sound: 'default',
          });

          await Notifications.setNotificationChannelAsync('academician', {
            name: 'Akademisyen Bildirimleri',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D4AF37',
            sound: 'default',
          });
        }

        // Bildirim ayarlarını yapılandır
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          }),
        });

      } catch (error) {
        console.error('Bildirim kurulumu sırasında hata:', error);
      }
    };

    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <SafeAreaProvider>
          <StatusBar backgroundColor="#11263E" barStyle="light-content" translucent={false} />
          <PaperProvider>
            <Stack 
              screenOptions={{ 
                headerShown: false,
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(student)" />
              <Stack.Screen name="(academician)" />
            </Stack>
          </PaperProvider>
        </SafeAreaProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
