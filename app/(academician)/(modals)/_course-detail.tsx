import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { BackHandler, Image, Platform, ScrollView, StyleSheet, ToastAndroid, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, DataTable, Dialog, Divider, IconButton, Portal, Text, TextInput } from 'react-native-paper';
import { useNotifications } from '../../../contexts/NotificationContext';
import { attendanceService } from '../../../services/attendance';
import { courseService } from '../../../services/course';
import { courseScheduleService } from '../../../services/courseSchedule';
import { reportService } from '../../../services/report';
import {
    Course,
    Student,
    StudentCourseSelection
} from '../../../types/course';
import { CourseSchedule } from '../../../types/courseSchedule';

interface StudentInfo {
    id: string;
    first_name: string;
    last_name: string;
    department?: string;
    faculty?: string;
    student_number?: string;
    class_?: string;
    email?: string;
}

interface SelectionWithStudent extends StudentCourseSelection {
    student?: StudentInfo;
}

export default function CourseDetailScreen() {
    const { courseId } = useLocalSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [course, setCourse] = useState<Course | null>(null);
    const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [courseSelections, setCourseSelections] = useState<SelectionWithStudent[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
    const [isDialogVisible, setIsDialogVisible] = useState(false);
    const [isConfirmDialogVisible, setIsConfirmDialogVisible] = useState(false);
    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
    const { addNotification } = useNotifications();
    const [attendanceRate, setAttendanceRate] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCancelDialogVisible, setIsCancelDialogVisible] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelDate, setCancelDate] = useState(new Date().toISOString().split('T')[0]);
    const [isCancelling, setIsCancelling] = useState(false);
    const [dateError, setDateError] = useState<string | null>(null);
    const [isApproving, setIsApproving] = useState(false);
    const [attendanceStats, setAttendanceStats] = useState<{ date: string; present: number; total: number }[]>([]);
    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string | null>(null);
    const [attendanceDetails, setAttendanceDetails] = useState<{ student: StudentInfo; status: boolean }[]>([]);
    const [isAttendanceDetailDialogVisible, setIsAttendanceDetailDialogVisible] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const router = useRouter();

    useEffect(() => {
        loadCourseData();
        loadCourseSelections();
        loadEnrolledStudents();
        loadAttendanceStats();
    }, [courseId]);

    useEffect(() => {
        const backAction = () => {
            router.replace('/(academician)/my-courses');
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

    const loadCourseData = async () => {
        try {
            setLoading(true);
            // Ders bilgilerini getir
            const courseData = await courseService.getCourseById(courseId as string);
            setCourse(courseData);

            // Ders programını getir
            const scheduleData = await courseScheduleService.getCourseSchedulesByCourse(courseId as string);
            // API yanıtı direkt olarak kullanılacak, .data property'sine gerek yok
            setSchedules(scheduleData);

            setError(null);
        } catch (err) {
            console.error('Ders bilgileri yüklenirken hata:', err);
            setError('Ders bilgileri yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const loadCourseSelections = async () => {
        try {
            const selections = await courseService.getCourseSelections(courseId as string);
            
            // Her seçim için öğrenci bilgilerini al
            const selectionsWithStudents = await Promise.all(
                selections.map(async (selection) => {
                    try {
                        const studentInfo = await courseService.getStudentInfo(selection.student_id);
                        return {
                            ...selection,
                            student: studentInfo
                        };
                    } catch (error) {
                        console.error('Öğrenci bilgileri alınamadı:', error);
                        return selection;
                    }
                })
            );
            
            setCourseSelections(selectionsWithStudents);
        } catch (err) {
            console.error('Ders seçimleri yüklenirken hata:', err);
        }
    };

    const loadEnrolledStudents = async () => {
        try {
            const students = await courseService.getCourseStudents(courseId as string);
            
            // Her öğrenci için detaylı bilgileri al
            const studentsWithDetails = await Promise.all(
                students.map(async (student) => {
                    try {
                        const studentInfo = await courseService.getStudentInfo(student.student_id);
                        return {
                            ...student,
                            ...studentInfo
                        };
                    } catch (error) {
                        console.error(`Öğrenci bilgileri alınamadı (ID: ${student.student_id}):`, error);
                        return student;
                    }
                })
            );
            
            setEnrolledStudents(studentsWithDetails || []);
        } catch (err) {
            console.error('Kayıtlı öğrenciler yüklenirken hata:', err);
            setEnrolledStudents([]);
        }
    };

    const loadAttendanceStats = async () => {
        try {
            // Tüm öğrencilerin yoklama kayıtlarını al
            const allAttendances = await attendanceService.getCourseAttendances(courseId as string);
            
            // Tarihlere göre grupla
            const statsByDate = allAttendances.reduce((acc: { [key: string]: { present: number; total: number } }, attendance) => {
                const date = new Date(attendance.date).toLocaleDateString('tr-TR');
                
                if (!acc[date]) {
                    acc[date] = { present: 0, total: 0 };
                }
                
                // İptal edilmiş dersleri sayma
                if (attendance.status !== null) {
                    acc[date].total++;
                    if (attendance.status === true) {
                        acc[date].present++;
                    }
                }
                
                return acc;
            }, {});

            // İstatistikleri tarihe göre sırala
            const sortedStats = Object.entries(statsByDate)
                .map(([date, stats]) => ({
                    date,
                    present: stats.present,
                    total: stats.total
                }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setAttendanceStats(sortedStats);
        } catch (error) {
            console.error('Yoklama istatistikleri yüklenirken hata:', error);
        }
    };

    const handleApproveSelection = async (selectionId: string) => {
        try {
            // Seçim detaylarını bul
            const selection = courseSelections.find(s => s.id === selectionId);
            if (!selection || !selection.student) return;

            // Seçimi onayla
            await courseService.approveStudentCourseSelection(selectionId);

            // Öğrenciye bildirim ekle
            addNotification({
                title: 'Ders Seçimi Onaylandı',
                message: `${course?.name} dersi seçiminiz onaylandı.`,
                type: 'student',
                userId: selection.student_id,
                relatedId: course?.id
            });

            // Akademisyene bildirim ekle
            addNotification({
                title: 'Ders Seçimi İşlemi',
                message: `${selection.student.first_name} ${selection.student.last_name} adlı öğrencinin ${course?.name} dersi seçimini onayladınız.`,
                type: 'academician',
                userId: course?.academician_id || '',
                relatedId: course?.id
            });

            await loadCourseSelections();
            await loadEnrolledStudents();
        } catch (err) {
            console.error('Ders seçimi onaylanırken hata:', err);
        }
    };

    const handleRejectSelection = async (selectionId: string) => {
        try {
            // Seçim detaylarını bul
            const selection = courseSelections.find(s => s.id === selectionId);
            if (!selection || !selection.student) return;

            // Seçimi reddet
            await courseService.rejectStudentCourseSelection(selectionId);

            // Öğrenciye bildirim ekle
            addNotification({
                title: 'Ders Seçimi Reddedildi',
                message: `${course?.name} dersi seçiminiz reddedildi.`,
                type: 'student',
                userId: selection.student_id,
                relatedId: course?.id
            });

            // Akademisyene bildirim ekle
            addNotification({
                title: 'Ders Seçimi İşlemi',
                message: `${selection.student.first_name} ${selection.student.last_name} adlı öğrencinin ${course?.name} dersi seçimini reddettiniz.`,
                type: 'academician',
                userId: course?.academician_id || '',
                relatedId: course?.id
            });

            await loadCourseSelections();
            await loadEnrolledStudents();
        } catch (err) {
            console.error('Ders seçimi reddedilirken hata:', err);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleStudentSelect = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleTakeAttendance = () => {
        if (course) {
            router.push({
                pathname: '/take-attendance',
                params: { courseId: course.id }
            });
        }
    };

    const formatSchedule = (schedules: CourseSchedule[]) => {
        if (!schedules || schedules.length === 0) return 'Program Yok';
        
        const days = {
            'Monday': 'Pazartesi',
            'Tuesday': 'Salı',
            'Wednesday': 'Çarşamba',
            'Thursday': 'Perşembe',
            'Friday': 'Cuma',
            'Saturday': 'Cumartesi',
            'Sunday': 'Pazar'
        };

        // Programları güne göre sırala
        const sortedSchedules = [...schedules].sort((a, b) => {
            const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            return weekdays.indexOf(a.weekday) - weekdays.indexOf(b.weekday);
        });
        
        // Her gün için tek bir program göster
        const uniqueSchedules = sortedSchedules.reduce((acc: CourseSchedule[], curr) => {
            const exists = acc.find(s => s.weekday === curr.weekday);
            if (!exists) {
                acc.push(curr);
            }
            return acc;
        }, []);
        
        return uniqueSchedules.map(schedule => 
            `${days[schedule.weekday as keyof typeof days]} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`
        ).join(', ');
    };

    const handleStudentPress = async (studentId: string) => {
        try {
            const studentInfo = await courseService.getStudentInfo(studentId);
            setSelectedStudent(studentInfo);
            setIsDialogVisible(true);
        } catch (error) {
            console.error('Öğrenci bilgileri alınamadı:', error);
        }
    };

    const handleSaveAttendanceRate = async () => {
        if (!course) return;
        
        try {
            setIsSaving(true);
            const rate = parseFloat(attendanceRate);
            
            if (isNaN(rate) || rate < 0 || rate > 100) {
                setError('Lütfen 0-100 arasında geçerli bir oran giriniz.');
                return;
            }

            // Yüzdeyi decimal değere çevir (örn: 70 -> 0.70)
            const decimalRate = rate / 100;

            await courseService.updateCourse(course.id, {
                attendances_rate_limit: decimalRate
            });

            // Akademisyene devam zorunluluğu değişikliği bildirimi
            if (course.academician_id) {
                addNotification({
                    title: 'Devam Zorunluluğu Güncellendi',
                    message: `${course.name} dersi için devam zorunluluğu oranını %${rate} olarak güncellediniz.`,
                    type: 'academician',
                    userId: course.academician_id,
                    relatedId: course.id
                });
            }

            // Dersin öğrencilerine bildirim gönder
            try {
                // Derse kayıtlı öğrencileri al
                const students = await courseService.getCourseStudents(course.id);
                
                // Her öğrenciye bildirim gönder
                for (const student of students) {
                    addNotification({
                        title: 'Devam Zorunluluğu Değişti',
                        message: `${course.name} dersi için devam zorunluluğu oranı %${rate} olarak güncellendi.`,
                        type: 'student',
                        userId: student.student_id,
                        relatedId: course.id
                    });

                    // Öğrencinin mevcut devam durumunu kontrol et
                    const performanceRecords = await courseService.getCoursePerformanceRecords(course.id);
                    const studentRecord = performanceRecords.find(record => record.student_id === student.student_id);

                    if (studentRecord) {
                        const currentRate = studentRecord.attendance_rate * 100;
                        // Eğer öğrencinin mevcut oranı yeni orandan düşükse uyarı gönder
                        if (currentRate < rate) {
                            addNotification({
                                title: 'Devam Durumu Uyarısı',
                                message: `${course.name} dersi için mevcut devam oranınız (%${currentRate.toFixed(1)}) yeni zorunlu oranın (%${rate}) altında. Lütfen derslere düzenli katılım sağlayın.`,
                                type: 'student',
                                userId: student.student_id,
                                relatedId: course.id
                            });
                        }
                    }
                }
            } catch (error) {
                console.log('Öğrenci bildirimleri gönderilirken hata:', error);
            }

            // Kurs bilgilerini yeniden yükle
            await loadCourseData();
            setError(null);
        } catch (err) {
            console.error('Yoklama oranı güncellenirken hata:', err);
            setError('Yoklama oranı güncellenirken bir hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetAttendanceRate = async () => {
        if (!course) return;
        
        try {
            setIsSaving(true);
            
            await courseService.updateCourse(course.id, {
                attendances_rate_limit: null
            });

            // Akademisyene devam zorunluluğu sıfırlama bildirimi
            if (course.academician_id) {
                addNotification({
                    title: 'Devam Zorunluluğu Sıfırlandı',
                    message: `${course.name} dersi için devam zorunluluğu oranını kaldırdınız.`,
                    type: 'academician',
                    userId: course.academician_id,
                    relatedId: course.id
                });
            }

            setAttendanceRate('');
            await loadCourseData();
            setError(null);
        } catch (err) {
            console.error('Yoklama oranı sıfırlanırken hata:', err);
            setError('Yoklama oranı sıfırlanırken bir hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const validateDate = (date: string) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (isNaN(selectedDate.getTime())) {
            setDateError('Geçerli bir tarih giriniz (YYYY-MM-DD)');
            return false;
        }

        if (selectedDate < today) {
            setDateError('Geçmiş bir tarih seçemezsiniz');
            return false;
        }

        setDateError(null);
        return true;
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setCancelDate(formattedDate);
            validateDate(formattedDate);
        }
    };

    const handleCancelClass = async () => {
        if (!course) return;

        if (!validateDate(cancelDate)) {
            return;
        }

        try {
            setIsCancelling(true);

            // Dersi iptal et ve yoklamaları geçersiz say
            await courseService.cancelClass(course.id, cancelDate);

            // Akademisyene bildirim ekle
            if (course.academician_id) {
                addNotification({
                    title: 'Ders İptal Edildi',
                    message: `${course.name} dersi ${new Date(cancelDate).toLocaleDateString('tr-TR')} tarihinde iptal edildi.`,
                    type: 'academician',
                    userId: course.academician_id,
                    relatedId: course.id
                });
            }

            // Öğrencilere bildirim gönder
            for (const student of enrolledStudents) {
                addNotification({
                    title: 'Ders İptal Edildi',
                    message: `${course.name} dersi ${new Date(cancelDate).toLocaleDateString('tr-TR')} tarihli dersi iptal edildi.${cancelReason ? ` İptal sebebi: ${cancelReason}` : ''}`,
                    type: 'student',
                    userId: student.student_id,
                    relatedId: course.id
                });
            }

            // Modal'ı kapat ve state'i sıfırla
            setIsCancelDialogVisible(false);
            setCancelReason('');
            setCancelDate(new Date().toISOString().split('T')[0]);
            setDateError(null);
            
            // Ders detay sayfasına yönlendir
            router.replace('/(academician)/my-courses');

        } catch (err) {
            console.error('Ders iptal edilirken hata:', err);
            setError('Ders iptal edilirken bir hata oluştu');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleBulkApprove = async () => {
        try {
            setIsApproving(true);
            const pendingSelections = courseSelections.filter(s => s.is_approved === null);
            
            for (const selection of pendingSelections) {
                await courseService.approveStudentCourseSelection(selection.id);

                if (selection.student) {
                    // Öğrenciye bildirim ekle
                    addNotification({
                        title: 'Ders Seçimi Onaylandı',
                        message: `${course?.name} dersi seçiminiz onaylandı.`,
                        type: 'student',
                        userId: selection.student_id,
                        relatedId: course?.id
                    });
                }
            }

            // Akademisyene toplu onay bildirimi
            if (course?.academician_id) {
                addNotification({
                    title: 'Toplu Ders Seçimi Onayı',
                    message: `${pendingSelections.length} öğrencinin ${course?.name} dersi seçimini onayladınız.`,
                    type: 'academician',
                    userId: course.academician_id,
                    relatedId: course.id
                });
            }

            await loadCourseSelections();
            await loadEnrolledStudents();
            setIsConfirmDialogVisible(false);
        } catch (err) {
            console.error('Toplu onaylama sırasında hata:', err);
            setError('Toplu onaylama işlemi sırasında bir hata oluştu');
        } finally {
            setIsApproving(false);
        }
    };

    const handleAttendanceRowPress = async (date: string) => {
        try {
            // Seçilen tarihteki yoklama detaylarını al
            const attendances = await attendanceService.getAttendancesByDate(courseId as string, date);
            
            // Öğrenci bilgilerini al ve yoklama durumlarıyla eşleştir
            const detailsWithStudentInfo = await Promise.all(
                attendances.map(async (attendance: { student_id: string; status: boolean | null }) => {
                    try {
                        const studentInfo = await courseService.getStudentInfo(attendance.student_id);
                        console.log('Öğrenci bilgisi alındı:', studentInfo); // Debug için log
                        return {
                            student: {
                                id: studentInfo.id,
                                first_name: studentInfo.first_name || 'İsim Yok',
                                last_name: studentInfo.last_name || 'Soyisim Yok',
                                student_number: studentInfo.student_number,
                                department: studentInfo.department,
                                faculty: studentInfo.faculty,
                                email: studentInfo.email
                            },
                            status: attendance.status || false
                        };
                    } catch (error) {
                        console.error(`Öğrenci bilgisi alınamadı (ID: ${attendance.student_id}):`, error);
                        return {
                            student: {
                                id: attendance.student_id,
                                first_name: 'Bilinmiyor',
                                last_name: '',
                                student_number: '',
                                department: '',
                                faculty: '',
                                email: ''
                            },
                            status: attendance.status || false
                        };
                    }
                })
            );

            console.log('Yoklama detayları:', detailsWithStudentInfo); // Debug için log
            setAttendanceDetails(detailsWithStudentInfo);
            setSelectedAttendanceDate(date);
            setIsAttendanceDetailDialogVisible(true);
        } catch (error) {
            console.error('Yoklama detayları alınırken hata:', error);
        }
    };

    const handleDownloadProgress = (downloadProgress: FileSystem.DownloadProgressData) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(progress);
    };

    const handleDownloadReport = async (date: string) => {
        try {
            console.log('Rapor indirme başlatıldı:', date);
            setIsSaving(true);
            setDownloadProgress(0);

            // Tarihi YYYY-MM-DD formatına çevir
            const [day, month, year] = date.split('.');
            const formattedDate = `${year}-${month}-${day}`;
            console.log('Formatlanmış tarih:', formattedDate);
            
            // API URL'ini ve token'ı kontrol et
            const downloadUrl = `${reportService.getBaseUrl()}/reports/attendance/${courseId}/${formattedDate}`;
            const token = await reportService.getToken();
            console.log('Download URL:', downloadUrl);
            console.log('Token mevcut:', !!token);

            if (Platform.OS === 'android') {
                const fileName = `yoklama_raporu_${course?.code}_${date.replace(/\./g, '_')}.pdf`;
                const downloadPath = `${FileSystem.documentDirectory}${fileName}`;

                console.log('İndirme başlatılıyor...', { downloadUrl, downloadPath });

                try {
                    const { uri: fileUri } = await FileSystem.downloadAsync(
                        downloadUrl,
                        downloadPath,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        }
                    );

                    if (fileUri) {
                        // Dosyayı paylaş
                        const isAvailable = await Sharing.isAvailableAsync();
                        if (isAvailable) {
                            await Sharing.shareAsync(fileUri, {
                                mimeType: 'application/pdf',
                                dialogTitle: 'Yoklama Raporu'
                            });

                            // Başarı bildirimi
                            ToastAndroid.show('Rapor indirildi', ToastAndroid.SHORT);
                            addNotification({
                                title: 'Rapor İndirildi',
                                message: `${course?.name} dersi ${date} tarihli yoklama raporu indirildi.`,
                                type: 'academician',
                                userId: course?.academician_id || '',
                                relatedId: course?.id
                            });
                        } else {
                            setError('Dosya paylaşımı bu cihazda desteklenmiyor.');
                        }
                    }
                } catch (error) {
                    console.error('Dosya indirme hatası:', error);
                    setError('Rapor indirilemedi. Lütfen tekrar deneyin.');
                }
            } else if (Platform.OS === 'ios') {
                // iOS için mevcut implementasyon
                const fileName = `yoklama_raporu_${course?.code}_${date.replace(/\./g, '_')}.pdf`;
                const fileUri = `${FileSystem.documentDirectory}${fileName}`;

                const downloadResumable = FileSystem.createDownloadResumable(
                    downloadUrl,
                    fileUri,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    },
                    handleDownloadProgress
                );

                try {
                    const downloadResult = await downloadResumable.downloadAsync();
                    
                    if (downloadResult?.uri) {
                        const isAvailable = await Sharing.isAvailableAsync();
                        if (isAvailable) {
                            await Sharing.shareAsync(downloadResult.uri, {
                                mimeType: 'application/pdf',
                                dialogTitle: 'Yoklama Raporu'
                            });

                            addNotification({
                                title: 'Rapor İndirildi',
                                message: `${course?.name} dersi ${date} tarihli yoklama raporu indirildi.`,
                                type: 'academician',
                                userId: course?.academician_id || '',
                                relatedId: course?.id
                            });
                        } else {
                            setError('Dosya paylaşımı bu cihazda desteklenmiyor.');
                        }
                    }
                } catch (error) {
                    console.error('Dosya indirme hatası:', error);
                    setError('Rapor indirilemedi. Lütfen tekrar deneyin.');
                }
            }
        } catch (error) {
            console.error('Genel hata:', error);
            setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsSaving(false);
            setDownloadProgress(0);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error || !course) {
        return (
            <View style={styles.errorContainer}>
                <Text variant="bodyLarge" style={styles.errorText}>
                    {error || 'Ders bulunamadı'}
                </Text>
                <Button mode="contained" onPress={loadCourseData}>Tekrar Dene</Button>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen 
                options={{
                    headerShown: false,
                }} 
            />
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Image 
                        source={require('../../../assets/images/logo_zemin1.png')}
                        style={styles.logo}
                        resizeMode="stretch"
                    />
                </View>
                <View style={styles.content}>
                    <Card style={styles.courseCard}>
                        <Card.Content>
                            <Text variant="headlineSmall" style={styles.courseTitle}>{course.name}</Text>
                            <Text variant="titleMedium" style={styles.courseCode}>{course.code}</Text>

                            <Divider style={styles.divider} />

                            <Text variant="titleMedium" style={styles.sectionTitle}>Ders Programı</Text>
                            {schedules && schedules.length > 0 ? (
                                schedules.map((schedule, index) => (
                                    <View key={schedule.id} style={styles.scheduleItem}>
                                        <Text style={styles.weekday}>
                                            {formatSchedule([schedule])}
                                        </Text>
                                        <Text style={styles.location}>
                                            {schedule.location || 'Konum belirtilmemiş'}
                                        </Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noSchedule}>
                                    Ders programı henüz belirlenmemiş
                                </Text>
                            )}

                            <View style={styles.actions}>
                                <Button
                                    mode="contained"
                                    onPress={handleTakeAttendance}
                                    style={styles.actionButton}
                                    buttonColor="#D4AF37"
                                    textColor="#11263E"
                                >
                                    Yoklama Al
                                </Button>
                                <Button
                                    mode="outlined"
                                    onPress={() => setIsCancelDialogVisible(true)}
                                    style={[styles.actionButton, styles.cancelButton]}
                                    textColor="#FF3B30"
                                >
                                    Dersi İptal Et
                                </Button>
                            </View>

                            <Divider style={styles.divider} />
                            
                            <View style={styles.attendanceRateContainer}>
                                <View style={styles.attendanceHeader}>
                                    <Text variant="titleMedium" style={styles.sectionTitle}>Devam Zorunluluğu</Text>
                                </View>
                                
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Mevcut Oran:</Text>
                                    <Text style={styles.infoValue}>
                                        {course?.attendances_rate_limit !== null && course?.attendances_rate_limit !== undefined
                                            ? `%${(course.attendances_rate_limit * 100).toFixed(0)}`
                                            : 'Belirtilmemiş'
                                        }
                                    </Text>
                                </View>

                                <View style={styles.attendanceInputContainer}>
                                    <TextInput
                                        placeholder="Yeni oran girin"
                                        value={attendanceRate}
                                        onChangeText={setAttendanceRate}
                                        keyboardType="numeric"
                                        style={styles.attendanceInput}
                                        maxLength={3}
                                        dense
                                        right={<TextInput.Affix text="%" textStyle={{ color: '#FFFFFF' }} />}
                                        theme={{ colors: { primary: '#D4AF37', text: '#FFFFFF', placeholder: '#B4B4B4' } }}
                                    />
                                    <IconButton
                                        icon="content-save"
                                        mode="contained"
                                        onPress={handleSaveAttendanceRate}
                                        disabled={isSaving || !attendanceRate}
                                        loading={isSaving}
                                        size={20}
                                        iconColor="#11263E"
                                        style={{ backgroundColor: '#D4AF37' }}
                                    />
                                    <IconButton
                                        icon="close"
                                        mode="outlined"
                                        onPress={handleResetAttendanceRate}
                                        disabled={isSaving || (!course?.attendances_rate_limit && !attendanceRate)}
                                        size={20}
                                        iconColor="#FF3B30"
                                        style={{ borderColor: '#FF3B30' }}
                                    />
                                </View>
                                {error && (
                                    <Text style={[styles.errorText, error.includes('başarıyla') && styles.successText]}>
                                        {error}
                                    </Text>
                                )}
                            </View>
                        </Card.Content>
                    </Card>

                    <Card style={styles.studentsCard}>
                        <Card.Content>
                            <View style={styles.sectionHeader}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>Ders Seçim İstekleri</Text>
                                <Chip 
                                    icon="account-clock" 
                                    mode="outlined" 
                                    style={{ borderColor: '#D4AF37' }} 
                                    textStyle={{ color: '#FFFFFF' }}
                                >
                                    {courseSelections.filter(s => s.is_approved === null).length} Bekleyen
                                </Chip>
                            </View>
                            
                            {courseSelections.filter(s => s.is_approved === null).length > 0 && (
                                <View style={styles.bulkApproveContainer}>
                                    <Button
                                        mode="contained"
                                        onPress={() => setIsConfirmDialogVisible(true)}
                                        style={styles.bulkApproveButton}
                                        buttonColor="#D4AF37"
                                        textColor="#11263E"
                                        loading={isApproving}
                                        disabled={isApproving}
                                    >
                                        Tümünü Onayla
                                    </Button>
                                </View>
                            )}

                            <DataTable>
                                <DataTable.Header style={styles.tableHeader}>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Ad Soyad</DataTable.Title>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Durum</DataTable.Title>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>İşlemler</DataTable.Title>
                                </DataTable.Header>

                                {courseSelections
                                    .filter(selection => selection.is_approved === null)
                                    .map((selection) => (
                                    <DataTable.Row 
                                        key={selection.id}
                                        onPress={() => handleStudentPress(selection.student_id)}
                                    >
                                        <DataTable.Cell textStyle={{ color: '#FFFFFF' }}>
                                            {selection.student?.first_name && selection.student?.last_name ? 
                                                `${selection.student.first_name} ${selection.student.last_name}` : 
                                                'İsim bilgisi yüklenemedi'}
                                        </DataTable.Cell>
                                        <DataTable.Cell>
                                            <Chip
                                                mode="flat"
                                                style={{
                                                    backgroundColor: selection.is_approved === true ? '#E8F5E9' : 
                                                                   selection.is_approved === false ? '#FFEBEE' : '#FFF3E0',
                                                    borderColor: selection.is_approved === true ? '#4CAF50' :
                                                                selection.is_approved === false ? '#FF3B30' : '#D4AF37'
                                                }}
                                                textStyle={{ color: '#11263E' }}
                                            >
                                                {selection.is_approved === true ? 'Onaylandı' : 
                                                 selection.is_approved === false ? 'Reddedildi' : 'Onay Bekliyor'}
                                            </Chip>
                                        </DataTable.Cell>
                                        <DataTable.Cell>
                                            {selection.is_approved === null && (
                                                <View style={styles.actionButtons}>
                                                    <IconButton
                                                        icon="check-circle"
                                                        iconColor="#4CAF50"
                                                        size={20}
                                                        onPress={() => handleApproveSelection(selection.id)}
                                                    />
                                                    <IconButton
                                                        icon="close-circle"
                                                        iconColor="#FF3B30"
                                                        size={20}
                                                        onPress={() => handleRejectSelection(selection.id)}
                                                    />
                                                </View>
                                            )}
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                ))}
                            </DataTable>
                        </Card.Content>
                    </Card>

                    <Card style={styles.studentsCard}>
                        <Card.Content>
                            <View style={styles.sectionHeader}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Yoklama İstatistikleri
                                </Text>
                                <Chip 
                                    icon="calendar-check" 
                                    mode="outlined" 
                                    style={{ borderColor: '#D4AF37' }} 
                                    textStyle={{ color: '#FFFFFF' }}
                                >
                                    {attendanceStats.length} Ders
                                </Chip>
                            </View>

                            <DataTable>
                                <DataTable.Header style={styles.tableHeader}>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Tarih</DataTable.Title>
                                    <DataTable.Title numeric textStyle={styles.tableHeaderText}>Katılım</DataTable.Title>
                                    <DataTable.Title numeric textStyle={styles.tableHeaderText}>Oran</DataTable.Title>
                                </DataTable.Header>

                                {attendanceStats.length > 0 ? (
                                    attendanceStats.map((stat, index) => (
                                        <DataTable.Row 
                                            key={index} 
                                            style={[styles.tableRow, styles.clickableRow]}
                                            onPress={() => handleAttendanceRowPress(stat.date)}
                                        >
                                            <DataTable.Cell textStyle={styles.tableCell}>
                                                {stat.date}
                                            </DataTable.Cell>
                                            <DataTable.Cell numeric textStyle={styles.tableCell}>
                                                {stat.present} / {stat.total}
                                            </DataTable.Cell>
                                            <DataTable.Cell numeric>
                                                <Text style={[
                                                    styles.tableCell,
                                                    stat.total === 0 && styles.cancelledClass
                                                ]}>
                                                    {stat.total === 0 ? 'İptal' : `%${((stat.present / stat.total) * 100).toFixed(0)}`}
                                                </Text>
                                            </DataTable.Cell>
                                        </DataTable.Row>
                                    ))
                                ) : (
                                    <DataTable.Row style={styles.tableRow}>
                                        <DataTable.Cell textStyle={styles.noResultText} style={{ flex: 3 }}>
                                            Henüz yoklama kaydı bulunmamaktadır
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                )}
                            </DataTable>

                            {attendanceStats.length > 0 && (
                                <View style={styles.statsOverview}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Ortalama Katılım</Text>
                                        <Text style={styles.statValue}>
                                            {(() => {
                                                // İptal edilmeyen dersleri filtrele
                                                const activeClasses = attendanceStats.filter(stat => stat.total > 0);
                                                if (activeClasses.length === 0) return '%0';
                                                
                                                // Ortalama katılım oranını hesapla
                                                const averageAttendance = (
                                                    activeClasses.reduce((sum, stat) => sum + (stat.present / stat.total), 0) / 
                                                    activeClasses.length
                                                ) * 100;
                                                
                                                return `%${averageAttendance.toFixed(0)}`;
                                            })()}
                                        </Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Toplam Ders</Text>
                                        <Text style={styles.statValue}>
                                            {attendanceStats.filter(stat => stat.total > 0).length} Aktif / {attendanceStats.filter(stat => stat.total === 0).length} İptal
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    <Card style={styles.studentsCard}>
                        <Card.Content>
                            <View style={styles.sectionHeader}>
                                <Text variant="titleMedium" style={styles.sectionTitle}>Kayıtlı Öğrenciler</Text>
                                <Chip 
                                    icon="account-check" 
                                    mode="outlined" 
                                    style={{ borderColor: '#D4AF37' }} 
                                    textStyle={{ color: '#FFFFFF' }}
                                >
                                    {enrolledStudents.length} Öğrenci
                                </Chip>
                            </View>

                            <DataTable>
                                <DataTable.Header style={styles.tableHeader}>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Ad Soyad</DataTable.Title>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Öğrenci No</DataTable.Title>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Sınıf</DataTable.Title>
                                    <DataTable.Title textStyle={styles.tableHeaderText}>Bölüm</DataTable.Title>
                                </DataTable.Header>

                                {enrolledStudents.length > 0 ? (
                                    enrolledStudents.map((student) => (
                                        <DataTable.Row 
                                            key={student.student_id}
                                            onPress={() => handleStudentPress(student.student_id)}
                                            style={styles.tableRow}
                                        >
                                            <DataTable.Cell textStyle={styles.tableCell}>
                                                {student.first_name} {student.last_name}
                                            </DataTable.Cell>
                                            <DataTable.Cell textStyle={styles.tableCell}>
                                                {student.student_number}
                                            </DataTable.Cell>
                                            <DataTable.Cell textStyle={styles.tableCell}>
                                                {student.class_ === 'hazirlik' ? 'Hazırlık' : 
                                                 `${student.class_}. Sınıf`}
                                            </DataTable.Cell>
                                            <DataTable.Cell textStyle={styles.tableCell}>
                                                {student.department}
                                            </DataTable.Cell>
                                        </DataTable.Row>
                                    ))
                                ) : (
                                    <DataTable.Row style={styles.tableRow}>
                                        <DataTable.Cell textStyle={styles.noResultText} style={{ flex: 3 }}>
                                            Henüz kayıtlı öğrenci bulunmamaktadır
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                )}
                            </DataTable>
                        </Card.Content>
                    </Card>
                </View>
            </ScrollView>

            <Portal>
                <Dialog 
                    visible={isDialogVisible} 
                    onDismiss={() => setIsDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={{ color: '#11263E' }}>Öğrenci Bilgileri</Dialog.Title>
                    <Dialog.Content>
                        {selectedStudent && (
                            <View style={styles.dialogContent}>
                                <View style={styles.dialogInfoRow}>
                                    <Text variant="bodyMedium" style={styles.label}>Ad Soyad:</Text>
                                    <Text variant="bodyLarge" style={styles.dialogText} numberOfLines={1}>
                                        {selectedStudent.first_name} {selectedStudent.last_name}
                                    </Text>
                                </View>
                                <View style={styles.dialogInfoRow}>
                                    <Text variant="bodyMedium" style={styles.label}>Sınıf:</Text>
                                    <Text variant="bodyLarge" style={styles.dialogText} numberOfLines={1}>
                                        {selectedStudent.class_ === 'hazirlik' ? 'Hazırlık' : 
                                         selectedStudent.class_ ? `${selectedStudent.class_}. Sınıf` : '-'}
                                    </Text>
                                </View>
                                <View style={styles.dialogInfoRow}>
                                    <Text variant="bodyMedium" style={styles.label}>Öğrenci No:</Text>
                                    <Text variant="bodyLarge" style={styles.dialogText} numberOfLines={1}>
                                        {selectedStudent.student_number || '-'}
                                    </Text>
                                </View>
                                <View style={styles.dialogInfoRow}>
                                    <Text variant="bodyMedium" style={styles.label}>E-posta:</Text>
                                    <Text variant="bodyLarge" style={styles.dialogText} numberOfLines={1}>
                                        {selectedStudent.email || '-'}
                                    </Text>
                                </View>
                                <View style={styles.dialogInfoRow}>
                                    <Text variant="bodyMedium" style={styles.label}>Fakülte:</Text>
                                    <Text variant="bodyLarge" style={styles.dialogText} numberOfLines={1}>
                                        {selectedStudent.faculty || '-'}
                                    </Text>
                                </View>
                                <View style={styles.dialogInfoRow}>
                                    <Text variant="bodyMedium" style={styles.label}>Bölüm:</Text>
                                    <Text variant="bodyLarge" style={styles.dialogText} numberOfLines={1}>
                                        {selectedStudent.department || '-'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button 
                            onPress={() => setIsDialogVisible(false)}
                            textColor="#11263E"
                        >
                            Kapat
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog 
                    visible={isCancelDialogVisible} 
                    onDismiss={() => setIsCancelDialogVisible(false)}
                    style={styles.cancelDialog}
                >
                    <Dialog.Title style={styles.cancelDialogTitle}>Dersi İptal Et</Dialog.Title>
                    <Dialog.Content style={styles.cancelDialogContent}>
                        <View style={styles.cancelInputContainer}>
                            <Text style={styles.cancelInputLabel}>İptal Tarihi</Text>
                            <View style={styles.datePickerContainer}>
                                <TextInput
                                    value={new Date(cancelDate).toLocaleDateString('tr-TR')}
                                    style={styles.cancelDateInput}
                                    editable={false}
                                    textColor="#000000"
                                    right={
                                        <TextInput.Icon 
                                            icon="calendar" 
                                            onPress={() => setShowDatePicker(true)}
                                            color="#D4AF37"
                                        />
                                    }
                                />
                                {(showDatePicker || Platform.OS === 'ios') && (
                                    <DateTimePicker
                                        value={new Date(cancelDate)}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateChange}
                                        minimumDate={new Date()}
                                        locale="tr"
                                        style={Platform.OS === 'ios' ? styles.iosDatePicker : undefined}
                                        textColor="#000000"
                                    />
                                )}
                            </View>
                            {dateError && (
                                <Text style={styles.cancelDateError}>{dateError}</Text>
                            )}
                        </View>
                        <View style={styles.cancelInputContainer}>
                            <Text style={styles.cancelInputLabel}>İptal Sebebi</Text>
                            <TextInput
                                value={cancelReason}
                                onChangeText={setCancelReason}
                                multiline
                                numberOfLines={3}
                                style={styles.cancelReasonInput}
                                placeholder="İptal sebebini yazınız..."
                                placeholderTextColor="#666666"
                                textColor="#000000"
                                theme={{ colors: { primary: '#D4AF37', text: '#000000', placeholder: '#666666' } }}
                            />
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions style={styles.cancelDialogActions}>
                        <Button 
                            onPress={() => {
                                setIsCancelDialogVisible(false);
                                setCancelDate(new Date().toISOString().split('T')[0]);
                                setCancelReason('');
                                setDateError(null);
                            }}
                            textColor="#11263E"
                            style={styles.cancelDialogButton}
                        >
                            Vazgeç
                        </Button>
                        <Button 
                            mode="contained"
                            onPress={handleCancelClass}
                            loading={isCancelling}
                            disabled={isCancelling || !cancelDate.trim() || !!dateError}
                            buttonColor="#FF3B30"
                            textColor="#FFFFFF"
                            style={styles.cancelDialogButton}
                        >
                            Dersi İptal Et
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog 
                    visible={isConfirmDialogVisible} 
                    onDismiss={() => setIsConfirmDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title style={{ color: '#11263E' }}>Tümünü Onayla</Dialog.Title>
                    <Dialog.Content>
                        <Text style={{ color: '#11263E' }}>
                            {courseSelections.filter(s => s.is_approved === null).length} öğrencinin ders seçim isteğini onaylamak istediğinizden emin misiniz?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button 
                            onPress={() => setIsConfirmDialogVisible(false)}
                            textColor="#11263E"
                        >
                            İptal
                        </Button>
                        <Button 
                            mode="contained"
                            onPress={handleBulkApprove}
                            loading={isApproving}
                            disabled={isApproving}
                            buttonColor="#D4AF37"
                            textColor="#11263E"
                        >
                            Onayla
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Portal>
                <Dialog 
                    visible={isAttendanceDetailDialogVisible} 
                    onDismiss={() => setIsAttendanceDetailDialogVisible(false)}
                    style={[styles.dialog, { backgroundColor: '#FFFFFF' }]}
                >
                    <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#E0E0E0',
                        backgroundColor: '#FFFFFF'
                    }}>
                        <IconButton 
                            icon="calendar" 
                            size={24} 
                            iconColor="#D4AF37"
                            style={{ margin: 0, padding: 0 }}
                        />
                        <Text style={{ 
                            color: '#11263E', 
                            fontSize: 18, 
                            fontWeight: '600',
                            marginLeft: 8,
                            flex: 1
                        }}>
                            {selectedAttendanceDate ? `${selectedAttendanceDate} Yoklama Detayı` : 'Yoklama Detayı'}
                        </Text>
                    </View>

                    <Dialog.ScrollArea style={{ paddingHorizontal: 0, maxHeight: 400 }}>
                        <View style={{ paddingBottom: 8 }}>
                            <View style={{ 
                                flexDirection: 'row', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                marginVertical: 12
                            }}>
                                <Chip 
                                    icon="account-group" 
                                    mode="flat" 
                                    style={{ backgroundColor: '#F5F5F5' }}
                                    textStyle={{ color: '#11263E', fontWeight: '600' }}
                                >
                                    {attendanceDetails.length} Öğrenci
                                </Chip>
                                <Chip 
                                    icon="check-circle" 
                                    mode="flat" 
                                    style={{ backgroundColor: '#E8F5E9' }}
                                    textStyle={{ color: '#2E7D32', fontWeight: '600' }}
                                >
                                    {attendanceDetails.filter(d => d.status).length} Var
                                </Chip>
                                <Chip 
                                    icon="close-circle" 
                                    mode="flat" 
                                    style={{ backgroundColor: '#FFEBEE' }}
                                    textStyle={{ color: '#C62828', fontWeight: '600' }}
                                >
                                    {attendanceDetails.filter(d => !d.status).length} Yok
                                </Chip>
                            </View>
                            <DataTable style={[styles.attendanceDetailTable, { borderWidth: 0 }]}>
                                <DataTable.Header style={[styles.attendanceDetailHeader, { borderBottomWidth: 0 }]}>
                                    <DataTable.Title 
                                        textStyle={styles.attendanceDetailHeaderText}
                                        style={{ flex: 3, borderBottomWidth: 0 }}
                                    >
                                        Öğrenci
                                    </DataTable.Title>
                                    <DataTable.Title 
                                        textStyle={styles.attendanceDetailHeaderText}
                                        style={{ flex: 1, borderBottomWidth: 0 }}
                                    >
                                        Durum
                                    </DataTable.Title>
                                </DataTable.Header>

                                {attendanceDetails.map((detail, index) => (
                                    <DataTable.Row 
                                        key={index} 
                                        style={[styles.attendanceDetailRow, { borderBottomWidth: 0 }]}
                                    >
                                        <DataTable.Cell 
                                            textStyle={styles.attendanceDetailCell}
                                            style={{ flex: 3, borderBottomWidth: 0 }}
                                        >
                                            <View>
                                                <Text style={[styles.attendanceDetailCell, { marginBottom: 2 }]}>
                                                    {`${detail.student.first_name} ${detail.student.last_name}`}
                                                </Text>
                                                <Text style={{ color: '#666666', fontSize: 12 }}>
                                                    {detail.student.student_number}
                                                </Text>
                                            </View>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1, borderBottomWidth: 0 }}>
                                            <Chip
                                                mode="flat"
                                                style={{
                                                    backgroundColor: detail.status ? '#E8F5E9' : '#FFEBEE',
                                                    width: 80,
                                                    borderRadius: 20,
                                                    borderWidth: 0,
                                                }}
                                                textStyle={{ 
                                                    color: detail.status ? '#2E7D32' : '#C62828',
                                                    fontWeight: '600',
                                                    textAlign: 'center'
                                                }}
                                            >
                                                {detail.status ? 'Var' : 'Yok'}
                                            </Chip>
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                ))}
                            </DataTable>
                        </View>
                    </Dialog.ScrollArea>

                    <View style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between',
                        padding: 16,
                        borderTopWidth: 1,
                        borderTopColor: '#E0E0E0',
                        backgroundColor: '#FFFFFF'
                    }}>
                        <Button 
                            onPress={() => setIsAttendanceDetailDialogVisible(false)}
                            textColor="#11263E"
                            style={{ borderRadius: 8 }}
                        >
                            Kapat
                        </Button>
                        <Button 
                            mode="contained"
                            onPress={() => selectedAttendanceDate && handleDownloadReport(selectedAttendanceDate)}
                            buttonColor="#D4AF37"
                            textColor={isSaving ? '#11263E' : '#11263E'}
                            icon={isSaving ? "loading" : "file-document-outline"}
                            loading={isSaving}
                            disabled={isSaving || !selectedAttendanceDate}
                            style={{ borderRadius: 8 }}
                            contentStyle={{ flexDirection: 'row-reverse' }}
                            labelStyle={{ 
                                color: '#11263E',
                                fontWeight: isSaving ? '700' : '600'
                            }}
                        >
                            {isSaving 
                                ? `İndiriliyor ${(downloadProgress * 100).toFixed(0)}%` 
                                : 'Rapor Al'
                            }
                        </Button>
                    </View>
                </Dialog>
            </Portal>
        </>
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
        padding: 20,
    },
    courseCard: {
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
        marginBottom: 16,
    },
    courseTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D4AF37',
        marginBottom: 8,
    },
    courseCode: {
        color: '#B4B4B4',
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 16,
    },
    actionButton: {
        flex: 1,
        borderRadius: 10,
    },
    cancelButton: {
        borderColor: '#FF3B30',
    },
    divider: {
        marginVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    sectionTitle: {
        marginBottom: 12,
        color: '#D4AF37',
        fontSize: 18,
        fontWeight: 'bold',
    },
    attendanceRateContainer: {
        marginVertical: 12,
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#D4AF37',
    },
    attendanceHeader: {
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    infoLabel: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    infoValue: {
        color: '#D4AF37',
        fontSize: 16,
        fontWeight: 'bold',
    },
    attendanceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    attendanceInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        height: 40,
        borderRadius: 8,
        color: '#FFFFFF',
        paddingHorizontal: 12,
    },
    scheduleItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#D4AF37',
    },
    weekday: {
        color: '#D4AF37',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    location: {
        color: '#B4B4B4',
        fontSize: 12,
    },
    noSchedule: {
        fontStyle: 'italic',
        color: '#B4B4B4',
        marginVertical: 8,
    },
    studentsCard: {
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
        marginBottom: 16,
    },
    searchContainer: {
        marginBottom: 16,
        gap: 8,
    },
    searchBar: {
        marginBottom: 0,
        borderRadius: 8,
        elevation: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    studentNameCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedText: {
        color: '#D4AF37',
        fontWeight: 'bold',
    },
    noResultText: {
        color: '#B4B4B4',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    tableHeader: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    tableHeaderText: {
        color: '#D4AF37',
        fontWeight: 'bold',
    },
    tableRow: {
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    tableCell: {
        color: '#FFFFFF',
    },
    selectedRow: {
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    bulkApproveContainer: {
        marginBottom: 16,
    },
    bulkApproveButton: {
        borderRadius: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 16,
    },
    errorText: {
        marginBottom: 16,
        textAlign: 'center',
        color: '#FF3B30',
    },
    successText: {
        color: '#4CAF50',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    dialogContent: {
        gap: 12,
        width: '100%',
    },
    dialogInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        width: '100%',
    },
    label: {
        fontWeight: '600',
        marginRight: 8,
        width: 100,
        color: '#11263E',
    },
    dialogText: {
        flex: 1,
        color: '#11263E',
        fontSize: 14,
    },
    cancelInput: {
        backgroundColor: '#fff',
        marginTop: 8,
        borderRadius: 8,
        borderColor: '#D4AF37',
    },
    statsOverview: {
        marginTop: 16,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
    },
    statItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        marginBottom: 8,
    },
    statLabel: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#D4AF37'
    },
    dialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        width: '90%',
        maxWidth: 600,
        alignSelf: 'center',
        elevation: 8,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    clickableRow: {
        cursor: 'pointer',
    },
    attendanceDetailTable: {
        width: '100%',
        paddingHorizontal: 8,
    },
    attendanceDetailHeader: {
        backgroundColor: '#11263E',
        borderRadius: 12,
        marginBottom: 8,
        height: 56,
    },
    attendanceDetailHeaderText: {
        color: '#D4AF37',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    attendanceDetailRow: {
        backgroundColor: 'rgba(17, 38, 62, 0.03)',
        borderRadius: 8,
        marginBottom: 4,
        height: 60,
    },
    attendanceDetailCell: {
        color: '#11263E',
        fontSize: 15,
        fontWeight: '500',
    },
    cancelDialog: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '90%',
        maxWidth: 500,
        alignSelf: 'center',
        elevation: 5,
    },
    cancelDialogTitle: {
        color: '#11263E',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    cancelDialogContent: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    cancelInputContainer: {
        marginBottom: 16,
    },
    cancelInputLabel: {
        color: '#11263E',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    cancelDateInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.2)',
        color: '#000000',
    },
    cancelReasonInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        minHeight: 100,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.2)',
        textAlignVertical: 'top',
        padding: 12,
        color: '#000000',
        fontSize: 16,
    },
    cancelDateError: {
        color: '#FF3B30',
        fontSize: 12,
        marginTop: 4,
    },
    cancelDialogActions: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        justifyContent: 'flex-end',
    },
    cancelDialogButton: {
        minWidth: 120,
        marginLeft: 8,
        borderRadius: 8,
    },
    datePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iosDatePicker: Platform.OS === 'ios' ? {
        width: '100%',
        height: 200,
        marginTop: 10,
    } : {},
    cancelledClass: {
        color: '#FF3B30',
        fontStyle: 'italic',
    },
} as const); 