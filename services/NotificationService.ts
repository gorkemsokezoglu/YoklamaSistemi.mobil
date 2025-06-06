import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationType = {
  id: string;
  userId: string;
  type: 'student' | 'academician';
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  relatedId?: string; // Ders ID'si veya başka bir ilişkili ID
};

let notificationListener: any;
let responseListener: any;

class NotificationService {
  static notificationContext: any = null;

  static setNotificationContext(context: any) {
    this.notificationContext = context;
  }

  static async setupNotificationListeners() {
    // Önceki dinleyicileri temizle
    if (notificationListener) {
      notificationListener.remove();
    }
    if (responseListener) {
      responseListener.remove();
    }

    // Bildirim alındığında
    notificationListener = Notifications.addNotificationReceivedListener(notification => {
      if (this.notificationContext) {
        const { title, body, data } = notification.request.content;
        this.notificationContext.addNotification({
          title: title || 'Bildirim',
          message: body || '',
          type: data?.type || 'student',
          userId: data?.userId || '',
          relatedId: data?.relatedId,
        });
      }
    });

    // Bildirime tıklandığında
    responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      // Bildirime tıklandığında yapılacak işlemler buraya eklenebilir
    });
  }

  static async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Bildirim dinleyicilerini kur
    await this.setupNotificationListeners();
    
    return true;
  }

  static async scheduleNotification(
    title: string, 
    body: string, 
    type: 'student' | 'academician' = 'student',
    userId: string = '',
    relatedId?: string,
    trigger?: any
  ) {
    try {
      console.log('Bildirim planlanıyor:', { title, body, type, userId, relatedId });
      
      const notificationId = Date.now().toString();

      // Önce context'e ekle
      if (this.notificationContext) {
        console.log('Bildirim context\'e ekleniyor:', {
          title,
          message: body,
          type,
          userId,
          relatedId,
        });
        
        await this.notificationContext.addNotification({
          title,
          message: body,
          type,
          userId,
          relatedId,
        });
      } else {
        console.warn('NotificationContext ayarlanmamış');
      }

      // Sonra bildirim gönder
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { 
            id: notificationId,
            type,
            userId,
            relatedId,
          },
        },
        identifier: notificationId,
        trigger: trigger || null,
      });

      return notificationId;
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
      throw error;
    }
  }

  static async sendLocalNotification(
    title: string, 
    body: string, 
    type: 'student' | 'academician' = 'student',
    userId: string = '',
    relatedId?: string
  ) {
    const notificationId = await this.scheduleNotification(title, body, type, userId, relatedId);
    return notificationId;
  }

  // Yoklama hatırlatması gönder
  static async sendAttendanceReminder(courseName: string, time: string, isTeacher: boolean, userId: string) {
    const title = 'Yoklama Hatırlatması';
    const message = isTeacher
      ? `${courseName} dersi için yoklama alma zamanı geldi.`
      : `${courseName} dersinin yoklaması ${time}'da alınacak.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  // Yeni ders bildirimi gönder
  static async sendNewCourseNotification(courseName: string, isTeacher: boolean, userId: string) {
    const title = 'Yeni Ders';
    const message = isTeacher
      ? `${courseName} dersi programınıza eklendi.`
      : `${courseName} dersine kaydınız yapıldı.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  // Öğrenci kaydı bildirimi gönder (sadece öğretmenler için)
  static async sendNewStudentNotification(courseName: string, studentCount: number, academicianId: string) {
    const title = 'Yeni Öğrenci Kaydı';
    const message = `${courseName} dersine ${studentCount} yeni öğrenci kaydoldu.`;
    
    await this.sendLocalNotification(title, message, 'academician', academicianId);
  }

  // Ders seçimi onay bekliyor bildirimi
  static async sendCourseSelectionPendingNotification(courseName: string, isTeacher: boolean, userId: string) {
    const title = 'Ders Seçimi';
    const message = isTeacher
      ? `${courseName} dersi için yeni bir ders seçim talebi var.`
      : `${courseName} dersi seçiminiz onay bekliyor.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  // Ders seçimi onaylandı bildirimi
  static async sendCourseSelectionApprovedNotification(courseName: string, studentId: string) {
    const title = 'Ders Seçimi Onaylandı';
    const message = `${courseName} dersi seçiminiz onaylandı.`;
    
    await this.sendLocalNotification(title, message, 'student', studentId);
  }

  // Ders seçimi reddedildi bildirimi
  static async sendCourseSelectionRejectedNotification(courseName: string, studentId: string) {
    const title = 'Ders Seçimi Reddedildi';
    const message = `${courseName} dersi seçiminiz reddedildi.`;
    
    await this.sendLocalNotification(title, message, 'student', studentId);
  }

  // Yoklama bildirimleri
  static async sendAttendanceStartedNotification(courseName: string, isTeacher: boolean, userId: string) {
    const title = 'Yoklama Başladı';
    const message = isTeacher
      ? `${courseName} dersi için yoklama alma işlemi başlattınız.`
      : `${courseName} dersi için yoklama alınıyor.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  static async sendAttendanceCompletedNotification(courseName: string, isTeacher: boolean, userId: string) {
    const title = 'Yoklama Tamamlandı';
    const message = isTeacher
      ? `${courseName} dersi için yoklama alma işlemi tamamlandı.`
      : `${courseName} dersi yoklaması tamamlandı.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  static async sendAttendanceMissedNotification(courseName: string, studentId: string) {
    const title = 'Yoklamada Yoksunuz';
    const message = `${courseName} dersinin yoklamasında bulunmadınız.`;
    
    await this.sendLocalNotification(title, message, 'student', studentId);
  }

  // Performans bildirimleri
  static async sendPerformanceUpdateNotification(courseName: string, isTeacher: boolean, userId: string) {
    const title = 'Performans Kaydı';
    const message = isTeacher
      ? `${courseName} dersi için performans kayıtları güncellendi.`
      : `${courseName} dersindeki performans notunuz güncellendi.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  // Ders programı bildirimleri
  static async sendScheduleChangeNotification(courseName: string, isTeacher: boolean, userId: string) {
    const title = 'Ders Programı Değişikliği';
    const message = `${courseName} dersinin programında değişiklik yapıldı.`;
    
    await this.sendLocalNotification(
      title, 
      message, 
      isTeacher ? 'academician' : 'student',
      userId
    );
  }

  // Genel sistem bildirimleri
  static async sendSystemNotification(title: string, message: string) {
    await this.sendLocalNotification(title, message);
  }

  // Özel bildirimler (akademisyenden öğrenciye veya tersi)
  static async sendCustomNotification(
    title: string,
    message: string,
    fromTeacher: boolean,
    userId: string,
    courseId?: string
  ) {
    await this.sendLocalNotification(
      title,
      message,
      'student', // Öğrenciye gönderilen bildirimler her zaman student tipinde olmalı
      userId,
      courseId
    );
  }

  // Devam durumu bildirimleri
  static async sendAttendanceWarningNotification(
    courseName: string, 
    currentRate: number, 
    requiredRate: number,
    studentId: string
  ) {
    const title = 'Yoklama Uyarısı';
    const message = `${courseName} dersi için yoklama oranınız %${(currentRate * 100).toFixed(1)}. Gerekli oran: %${requiredRate}`;
    
    await this.sendLocalNotification(
      title,
      message,
      'student',
      studentId
    );
  }

  static async sendAttendanceRiskNotification(
    courseName: string, 
    currentRate: number, 
    requiredRate: number,
    studentId: string
  ) {
    const title = 'Kritik Yoklama Uyarısı';
    const message = `${courseName} dersi için yoklama oranınız kritik seviyede! Mevcut: %${(currentRate * 100).toFixed(1)}, Gerekli: %${requiredRate}`;
    
    await this.sendLocalNotification(
      title,
      message,
      'student',
      studentId
    );
  }
}

export default NotificationService; 