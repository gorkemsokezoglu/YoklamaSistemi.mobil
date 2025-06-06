import { Attendance } from '../types/attendance';
import api from './api';
import { courseService } from './course';
import NotificationService from './NotificationService';

export const attendanceService = {
    // Tüm yoklamaları getir
    getAllAttendances: async (): Promise<Attendance[]> => {
        try {
            console.log('Tüm yoklamalar getiriliyor');
            const response = await api.get('/attendances/');
            console.log('Yoklamalar alındı:', response.data);
            return response.data;
        } catch (error) {
            console.log('Yoklama getirme servisi hatası:', error);
            return []; // Hata durumunda boş dizi dön
        }
    },

    // Yeni yoklama oluştur
    createAttendance: async (attendance: Omit<Attendance, 'id'>): Promise<Attendance | null> => {
        try {
            console.log('Yoklama oluşturuluyor:', attendance);
            const response = await api.post('/attendances/', attendance);
            console.log('Yoklama oluşturuldu:', response.data);

            // Dersin detaylarını al
            const course = await courseService.getCourseById(attendance.course_id);
            
            // Öğrencinin performans kaydını kontrol et
            const performanceRecords = await courseService.getCoursePerformanceRecords(attendance.course_id);
            const studentRecord = performanceRecords.find(record => record.student_id === attendance.student_id);

            if (studentRecord && course.attendances_rate_limit) {
                const currentRate = studentRecord.attendance_rate;
                const requiredRate = course.attendances_rate_limit / 100;
                const riskThreshold = 0.05; // %5'lik risk eşiği

                // Eğer öğrencinin oranı gerekli orandan düşükse
                if (currentRate < requiredRate) {
                    // Kritik seviyede düşükse
                    if (requiredRate - currentRate > riskThreshold) {
                        await NotificationService.sendAttendanceWarningNotification(
                            course.name,
                            currentRate,
                            course.attendances_rate_limit,
                            attendance.student_id
                        );
                    }
                    // Normal uyarı
                    else {
                        await NotificationService.sendAttendanceWarningNotification(
                            course.name,
                            currentRate,
                            course.attendances_rate_limit,
                            attendance.student_id
                        );
                    }
                }
            }

            return response.data;
        } catch (error) {
            console.log('Yoklama oluşturma servisi hatası:', error);
            return null; // Hata durumunda null dön
        }
    },

    // Belirli bir yoklamayı getir
    getAttendanceById: async (attendanceId: string): Promise<Attendance | null> => {
        try {
            console.log('Yoklama detayı getiriliyor:', attendanceId);
            const response = await api.get(`/attendances/${attendanceId}`);
            console.log('Yoklama detayı alındı:', response.data);
            return response.data;
        } catch (error) {
            console.log('Yoklama detayı getirme servisi hatası:', error);
            return null; // Hata durumunda null dön
        }
    },

    // Öğrencinin kendi yoklamalarını getir
    getMyAttendances: async (): Promise<Attendance[]> => {
        try {
            console.log('Öğrenci yoklamaları getiriliyor');
            const response = await api.get('/attendances/myAttendances/');
            console.log('Öğrenci yoklamaları alındı:', response.data);
            return response.data;
        } catch (error) {
            console.log('Öğrenci yoklamaları getirme servisi hatası:', error);
            return []; // Hata durumunda boş dizi dön
        }
    },

    // Belirli bir dersin yoklamalarını getir
    getCourseAttendances: async (courseId: string): Promise<Attendance[]> => {
        try {
            console.log('Ders yoklamaları getiriliyor:', courseId);
            const response = await api.get(`/attendances/course/${courseId}`);
            console.log('Ders yoklamaları alındı:', response.data);
            return response.data;
        } catch (error) {
            console.log('Ders yoklamaları getirme servisi hatası:', error);
            return []; // Hata durumunda boş dizi dön
        }
    },

    // Belirli bir tarihteki yoklamaları getir
    getAttendancesByDate: async (courseId: string, date: string): Promise<Attendance[]> => {
        try {
            console.log('Tarih bazlı yoklamalar getiriliyor:', { courseId, date });
            const allAttendances = await attendanceService.getCourseAttendances(courseId);
            const dateAttendances = allAttendances.filter(
                attendance => new Date(attendance.date).toLocaleDateString('tr-TR') === date
            );
            console.log('Tarih bazlı yoklamalar alındı:', dateAttendances);
            return dateAttendances;
        } catch (error) {
            console.log('Tarih bazlı yoklama getirme servisi hatası:', error);
            return []; // Hata durumunda boş dizi dön
        }
    },
}; 