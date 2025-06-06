import {
  AcademicianCourseSelection,
  Course,
  CourseSchedule,
  CreateAcademicianCourseSelectionRequest,
  CreateCourseRequest,
  CreatePerformanceRecordRequest,
  CreateStudentCourseSelectionRequest,
  PerformanceRecord,
  Student,
  StudentCourseSelection,
  UpdatePerformanceRecordRequest
} from '../types/course';
import api from './api';
import { attendanceService } from './attendance';
import { authService } from './auth';
import NotificationService from './NotificationService';

export const courseService = {
  // Ders Listeleme ve Yönetimi
  getAllCourses: async (): Promise<Course[]> => {
    const response = await api.get('/courses');
    return response.data;
  },

  getMyCourses: async (): Promise<Course[]> => {
    const response = await api.get('/courses/my-courses');
    return response.data;
  },

  createCourse: async (data: CreateCourseRequest): Promise<Course> => {
    const response = await api.post('/courses', {
      name: data.name,
      code: data.code,
      academician_id: data.academician_id,
      attendances_rate_limit: data.attendances_rate_limit
    });

    // Akademisyene bildirim gönder
    if (data.academician_id) {
      await NotificationService.sendCustomNotification(
        'Yeni Ders Atama',
        `${data.name} dersi size atandı.`,
        true,
        response.data.id
      );
    }

    return response.data;
  },

  updateCourse: async (courseId: string, data: Partial<Course>): Promise<Course> => {
    const response = await api.put(`/courses/${courseId}`, data);

    // Akademisyen değiştiyse eski ve yeni akademisyene bildirim gönder
    if (data.academician_id) {
      const oldCourse = await courseService.getCourseById(courseId);
      if (oldCourse.academician_id && oldCourse.academician_id !== data.academician_id) {
        // Eski akademisyene bildirim
        await NotificationService.sendCustomNotification(
          'Ders Ataması Kaldırıldı',
          `${oldCourse.name} dersi atamanız kaldırıldı.`,
          true,
          courseId
        );
      }

      // Yeni akademisyene bildirim
      await NotificationService.sendCustomNotification(
        'Yeni Ders Atama',
        `${response.data.name} dersi size atandı.`,
        true,
        courseId
      );
    }

    // Yoklama oranı değiştiyse bildirim gönder
    if (data.attendances_rate_limit !== undefined) {
      await NotificationService.sendCustomNotification(
        'Yoklama Oranı Güncellendi',
        `${response.data.name} dersi için yoklama oranı ${data.attendances_rate_limit}% olarak güncellendi.`,
        true,
        courseId
      );
    }

    return response.data;
  },

  deleteCourse: async (courseId: string): Promise<void> => {
    const course = await courseService.getCourseById(courseId);
    await api.delete(`/courses/${courseId}`);

    // Akademisyene ve kayıtlı öğrencilere bildirim gönder
    if (course.academician_id) {
      await NotificationService.sendCustomNotification(
        'Ders Silindi',
        `${course.name} dersi sistemden kaldırıldı.`,
        true,
        courseId
      );
    }
  },

  getStudentCourseSelections: async (): Promise<StudentCourseSelection[]> => {
    const response = await api.get('/course-selections-student/my-selections');
    return response.data;
  },

  deleteStudentCourseSelection: async (selectionId: string): Promise<void> => {
    await api.delete(`/course-selections-student/${selectionId}`);
  },

  // Ders Seçimi - Akademisyen
  createAcademicianCourseSelection: async (data: CreateAcademicianCourseSelectionRequest): Promise<AcademicianCourseSelection> => {
    try {
      const response = await api.post('/course-selections-academicians/', {
        academician_id: data.academician_id,
        course_id: data.course_id,
        is_approved: data.is_approved
      });
      return response.data;
    } catch (error) {
      console.error('Akademisyen ders seçimi kaydedilirken hata:', error);
      throw error;
    }
  },

  getAcademicianCourseSelections: async (): Promise<AcademicianCourseSelection[]> => {
    const response = await api.get('/course-selections-academicians');
    return response.data;
  },

  deleteAcademicianCourseSelection: async (selectionId: string): Promise<void> => {
    await api.delete(`/course-selections-academicians/${selectionId}`);
  },

  // Onay İşlemleri
  getPendingApprovals: async (academicianId: string): Promise<StudentCourseSelection[]> => {
    const response = await api.get(`/course-selections-student/pending-approvals/${academicianId}`);
    return response.data;
  },

  approveStudentCourseSelection: async (selectionId: string): Promise<void> => {
    await api.put(`/course-selections-student/approve/${selectionId}`);
  },

  //o derse ait ders seçimlerini getir
  getCourseSelections: async (courseId: string): Promise<StudentCourseSelection[]> => {
    const response = await api.get(`/course-selections-student/course/${courseId}`);
    return response.data;
  },
 
  // Performans kayıtları
  getMyPerformanceRecords: async (): Promise<PerformanceRecord[]> => {
    try {
      const response = await api.get('/performance-records/my-records');
      return response.data;
    } catch (error) {
      console.log('Performans kayıtları alınırken hata:', error);
      return []; // Hata durumunda boş dizi dön
    }
  },

  getCoursePerformanceRecords: async (courseId: string): Promise<PerformanceRecord[]> => {
    try {
      const response = await api.get(`/performance-records/course/${courseId}`);
      return response.data;
    } catch (error) {
      console.log('Ders performans kayıtları alınırken hata:', error);
      return []; // Hata durumunda boş dizi dön
    }
  },

  createPerformanceRecord: async (data: CreatePerformanceRecordRequest): Promise<PerformanceRecord | null> => {
    try {
      const response = await api.post('/performance-records', data);
      return response.data;
    } catch (error) {
      console.log('Performans kaydı oluşturulurken hata:', error);
      return null; // Hata durumunda null dön
    }
  },

  updatePerformanceRecord: async (recordId: string, data: UpdatePerformanceRecordRequest): Promise<PerformanceRecord | null> => {
    try {
      const response = await api.put(`/performance-records/${recordId}`, data);
      return response.data;
    } catch (error) {
      console.log('Performans kaydı güncellenirken hata:', error);
      return null; // Hata durumunda null dön
    }
  },

  deletePerformanceRecord: async (recordId: string): Promise<boolean> => {
    try {
      await api.delete(`/performance-records/${recordId}`);
      return true;
    } catch (error) {
      console.log('Performans kaydı silinirken hata:', error);
      return false; // Hata durumunda false dön
    }
  },

  // Devam durumu kontrolü ve bildirim
  checkAttendanceStatus: async (courseId: string): Promise<void> => {
    try {
      // Önce performans kaydını al
      const performanceRecords = await courseService.getMyPerformanceRecords();
      const courseRecord = performanceRecords.find(record => record.course_id === courseId);
      
      if (!courseRecord) {
        console.log('Performans kaydı henüz oluşturulmamış:', courseId);
        return;
      }

      // Dersi al
      const course = await courseService.getCourseById(courseId);
      
      // Devam zorunluluğu yoksa kontrol etmeye gerek yok
      if (!course.attendances_rate_limit) {
        return;
      }

      const currentRate = courseRecord.attendance_rate; // Zaten 0-1 arası decimal
      const requiredRate = course.attendances_rate_limit;
      const riskThreshold = 0.05; // %5'lik risk eşiği

      // Eğer mevcut oran gerekli oranın altındaysa
      if (currentRate < requiredRate) {
        await NotificationService.sendAttendanceWarningNotification(
          course.name,
          currentRate,
          requiredRate,
          courseRecord.student_id
        );
      }
      // Eğer mevcut oran gerekli oranın üstünde ama risk eşiğine yakınsa
      else if (currentRate - requiredRate < riskThreshold) {
        await NotificationService.sendAttendanceRiskNotification(
          course.name,
          currentRate,
          requiredRate,
          courseRecord.student_id
        );
      }
    } catch (error) {
      // Sadece loglama yap, kullanıcıya hata gösterme
      console.log('Devam durumu kontrolü yapılırken hata:', error);
    }
  },

  // Akademisyeni atanmış tüm dersleri getir
  getAvailableCourses: async (): Promise<Course[]> => {
    try {
      const response = await api.get('/courses');
      // Akademisyeni atanmış dersleri filtrele
      return response.data.filter((course: Course) => course.academician_id !== null);
    } catch (error) {
      console.error('Ders listesi alınırken hata:', error);
      throw error;
    }
  },

  // Ders seçimlerini kaydet
  createCourseSelections: async (data: CreateStudentCourseSelectionRequest): Promise<void> => {
    try {
      await api.post('/course-selections-student/', {
        student_id: data.student_id,
        course_ids: data.course_ids,
        is_approved: null // Onay bekleyen durumu için null gönderiyoruz
      });
    } catch (error) {
      console.error('Ders seçimleri kaydedilirken hata:', error);
      throw error;
    }
  },

  // Ders seçimini reddet
  rejectStudentCourseSelection: async (selectionId: string): Promise<void> => {
    await api.put(`/course-selections-student/reject/${selectionId}`);
  },

  // Öğrenci bilgilerini getir (user ve student tablolarından)
  getStudentInfo: async (studentId: string) => {
    try {
      // Önce öğrenci bilgilerini al
      const studentResponse = await api.get(`/students/${studentId}`);
      const studentData = studentResponse.data;

      // Sonra kullanıcı bilgilerini al
      const userResponse = await authService.getUserById(studentData.user_id);
      const userData = userResponse;

      // İki kaynaktan gelen bilgileri birleştir
      return {
        ...studentData,
        ...userData
      };
    } catch (error) {
      console.error('Öğrenci bilgileri alınamadı:', error);
      throw error;
    }
  },

  // Belirli bir dersin detaylarını getir
  getCourseById: async (courseId: string): Promise<Course> => {
    const response = await api.get(`/courses/${courseId}`);
    const schedules = await courseService.getCourseSchedules(courseId);
    return {
      ...response.data,
      schedules
    };
  },

  // Derse kayıtlı öğrencileri getir
  getCourseStudents: async (courseId: string): Promise<Student[]> => {
    try {
      const response = await api.get(`/course-selections-student/course/${courseId}/students`);
      return response.data;
    } catch (error) {
      console.error('Derse kayıtlı öğrenciler alınamadı:', error);
      throw error;
    }
  },

  getCourseSchedules: async (courseId: string): Promise<CourseSchedule[]> => {
    const response = await api.get(`/course-schedules/course/${courseId}`);
    return response.data;
  },

  // Ders iptal et
  cancelClass: async (courseId: string, cancelDate: string): Promise<void> => {
    try {
      // Dersi iptal et
      const formattedDate = new Date(cancelDate).toISOString().split('T')[0];
      await api.post(`/courses/${courseId}/cancel?cancel_date=${formattedDate}`);

      // Dersi al
      const course = await courseService.getCourseById(courseId);

      // Öğrencilere bildirim gönder
      const students = await courseService.getCourseStudents(courseId);
      for (const student of students) {
        await NotificationService.sendCustomNotification(
          'Ders İptal Edildi',
          `${course.name} dersi ${new Date(cancelDate).toLocaleDateString('tr-TR')} tarihli dersi iptal edildi.`,
          true,
          courseId
        );
      }
    } catch (error) {
      console.error('Ders iptal edilirken hata:', error);
      throw error;
    }
  },

  // Ders iptal işlemi
  cancelCourse: async (courseId: string, date: string, reason: string): Promise<void> => {
    try {
      // Dersi iptal et
      await api.post(`/courses/${courseId}/cancel`, { date, reason });

      // Dersin detaylarını al
      const course = await courseService.getCourseById(courseId);
      
      // Derse kayıtlı öğrencileri al
      const selections = await courseService.getCourseSelections(courseId);
      const students = selections.map(selection => ({ id: selection.student_id }));

      // Tüm öğrencilere bildirim gönder
      for (const student of students) {
        await NotificationService.sendCustomNotification(
          'Ders İptali',
          `${course.name} dersi ${date} tarihinde ${reason} nedeniyle iptal edilmiştir.`,
          false,
          student.id,
          courseId
        );
      }
    } catch (error) {
      console.error('Ders iptal edilirken hata:', error);
      throw error;
    }
  },

  // Yoklama oranı güncelleme
  updateAttendanceRate: async (courseId: string, newRate: number): Promise<void> => {
    try {
      // Oranı güncelle
      await courseService.updateCourse(courseId, { attendances_rate_limit: newRate });

      // Dersin detaylarını al
      const course = await courseService.getCourseById(courseId);
      
      // Derse kayıtlı öğrencileri al
      const selections = await courseService.getCourseSelections(courseId);
      const students = selections.map(selection => ({ id: selection.student_id }));

      // Tüm öğrencilere bildirim gönder
      for (const student of students) {
        await NotificationService.sendCustomNotification(
          'Yoklama Oranı Güncellendi',
          `${course.name} dersi için gerekli yoklama oranı %${newRate} olarak güncellenmiştir.`,
          false,
          student.id,
          courseId
        );

        // Her öğrencinin mevcut yoklama oranını kontrol et
        const performanceRecords = await courseService.getCoursePerformanceRecords(courseId);
        const studentRecord = performanceRecords.find(record => record.student_id === student.id);
        
        if (studentRecord) {
          const currentRate = studentRecord.attendance_rate;
          
          // Eğer öğrencinin oranı yeni orandan düşükse uyarı gönder
          if (currentRate < newRate / 100) {
            await NotificationService.sendAttendanceWarningNotification(
              course.name,
              currentRate,
              newRate,
              student.id
            );
          }
        }
      }
    } catch (error) {
      console.error('Yoklama oranı güncellenirken hata:', error);
      throw error;
    }
  },

  // Ders programı değişikliği
  updateCourseSchedule: async (
    courseId: string,
    oldSchedule: CourseSchedule,
    newSchedule: CourseSchedule
  ): Promise<void> => {
    try {
      // Programı güncelle
      await api.put(`/courses/${courseId}/schedule`, { oldSchedule, newSchedule });

      // Dersin detaylarını al
      const course = await courseService.getCourseById(courseId);
      
      // Derse kayıtlı öğrencileri al
      const selections = await courseService.getCourseSelections(courseId);
      const students = selections.map(selection => ({ id: selection.student_id }));

      // Eski ve yeni program bilgilerini formatla
      const formatSchedule = (schedule: CourseSchedule) => 
        `${schedule.weekday} ${schedule.start_time}-${schedule.end_time}`;

      // Tüm öğrencilere bildirim gönder
      for (const student of students) {
        await NotificationService.sendCustomNotification(
          'Ders Programı Değişikliği',
          `${course.name} dersi programı ${formatSchedule(oldSchedule)} -> ${formatSchedule(newSchedule)} olarak değiştirilmiştir.`,
          false,
          student.id,
          courseId
        );
      }
    } catch (error) {
      console.error('Ders programı güncellenirken hata:', error);
      throw error;
    }
  },

  // Yoklama başlatma
  startAttendance: async (courseId: string, duration: number): Promise<void> => {
    try {
      // Yoklamayı başlat
      await api.post(`/courses/${courseId}/attendance/start`, { duration });

      // Dersin detaylarını al
      const course = await courseService.getCourseById(courseId);
      
      // Derse kayıtlı öğrencileri al
      const selections = await courseService.getCourseSelections(courseId);
      const students = selections.map(selection => ({ id: selection.student_id }));

      // Tüm öğrencilere bildirim gönder
      for (const student of students) {
        await NotificationService.sendCustomNotification(
          'Yoklama Başladı',
          `${course.name} dersi için yoklama alınmaya başlandı. ${duration} dakika içinde yoklamanızı verin.`,
          false,
          student.id,
          courseId
        );
      }

      // Hatırlatma bildirimi için zamanlayıcı ayarla
      const reminderTime = duration > 5 ? duration - 5 : Math.floor(duration / 2);
      setTimeout(async () => {
        // Henüz yoklama vermemiş öğrencileri bul
        const attendances = await attendanceService.getAttendancesByDate(courseId, new Date().toLocaleDateString('tr-TR'));
        const presentStudentIds = attendances.map((attendance) => attendance.student_id);
        const absentStudents = students.filter(student => !presentStudentIds.includes(student.id));

        // Yoklama vermemiş öğrencilere hatırlatma gönder
        for (const student of absentStudents) {
          await NotificationService.sendCustomNotification(
            'Yoklama Hatırlatma',
            `${course.name} dersi yoklaması için son ${reminderTime} dakika! Lütfen yoklamanızı verin.`,
            false,
            student.id,
            courseId
          );
        }
      }, (duration - reminderTime) * 60 * 1000);
    } catch (error) {
      console.error('Yoklama başlatılırken hata:', error);
      throw error;
    }
  },

}; 