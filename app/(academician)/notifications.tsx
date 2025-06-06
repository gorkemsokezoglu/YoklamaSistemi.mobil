import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationType } from '../../services/NotificationService';

const NotificationItem = ({ item, onPress }: { item: NotificationType; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.notificationItem, !item.isRead && styles.unread]}>
    <View style={styles.notificationIcon}>
      <MaterialCommunityIcons 
        name={item.isRead ? "bell-outline" : "bell-ring"} 
        size={24} 
        color={item.isRead ? "#B4B4B4" : "#D4AF37"} 
      />
    </View>
    <View style={styles.notificationContent}>
      <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.date}>{new Date(item.date).toLocaleString('tr-TR')}</Text>
    </View>
  </TouchableOpacity>
);

export default function AcademicianNotificationsScreen() {
  const { notifications, markAsRead, clearAllNotifications, user } = useNotifications();
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationType[]>([]);

  useEffect(() => {
    console.log('Academician Notifications Screen - User:', user);
    console.log('Academician Notifications Screen - All Notifications:', notifications);

    if (user && notifications) {
      // Akademisyene ait bildirimleri filtrele
      const userNotifications = notifications.filter(
        notification => notification.type === 'academician' && notification.userId === user.id
      );
      console.log('Academician Notifications Screen - Filtered Notifications:', userNotifications);
      setFilteredNotifications(userNotifications);
    }
  }, [notifications, user]);

  const handleNotificationPress = (notification: NotificationType) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const handleClearAll = async () => {
    clearAllNotifications();
    setFilteredNotifications([]);
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bell-off-outline" size={64} color="#B4B4B4" />
      <Text style={styles.emptyText}>Henüz bildiriminiz bulunmamaktadır</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#11263E" />
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/logo_zemin1.png')}
          style={styles.logo}
          resizeMode="stretch"
        />
      </View>

      <View style={styles.content}>
        {filteredNotifications.length > 0 && (
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => {
                filteredNotifications.forEach(notification => {
                  if (!notification.isRead) {
                    markAsRead(notification.id);
                  }
                });
              }}
              style={styles.actionButton}
              buttonColor="#D4AF37"
              textColor="#FFFFFF"
            >
              Tümünü Okundu İşaretle
            </Button>
            <Button
              mode="contained"
              onPress={handleClearAll}
              style={styles.actionButton}
              buttonColor="#FF3B30"
              textColor="#FFFFFF"
            >
              Tümünü Temizle
            </Button>
          </View>
        )}

        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} onPress={() => handleNotificationPress(item)} />
          )}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#11263E',
    width: '100%',
    height: 100,
    padding: 0,
    overflow: 'hidden',
    paddingTop: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    flexGrow: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#B4B4B4',
    fontSize: 16,
    textAlign: 'center',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unread: {
    backgroundColor: '#FFF8E7',
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  notificationIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11263E',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#D4AF37',
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#B4B4B4',
  },
}); 