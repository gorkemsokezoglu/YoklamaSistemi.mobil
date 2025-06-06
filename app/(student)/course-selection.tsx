import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Searchbar, Snackbar, Text } from 'react-native-paper';
import { useNotifications } from '../../contexts/NotificationContext';
import { academicianService } from '../../services/academician';
import { courseService } from '../../services/course';
import NotificationService from '../../services/NotificationService';
import { studentService } from '../../services/student';
import { AcademicianProfile, StudentProfile } from '../../types/auth';
import { Course } from '../../types/course';
import { CourseSchedule } from '../../types/courseSchedule';

// Türkçe gün isimleri için sabit
const weekdayMap: { [key: string]: string } = {
    'Monday': 'Pazartesi',
    'Tuesday': 'Salı',
    'Wednesday': 'Çarşamba',
    'Thursday': 'Perşembe',
    'Friday': 'Cuma',
    'Saturday': 'Cumartesi',
    'Sunday': 'Pazar'
};

// Course tipini genişlet
interface ExtendedCourse extends Omit<Course, 'schedules'> {
    schedules?: CourseSchedule[];
    academician?: AcademicianProfile;
}

// Gün çevirisi için yardımcı fonksiyon
const translateDay = (text: string): string => {
    const dayTranslations: { [key: string]: string } = {
        'monday': 'Pazartesi',
        'tuesday': 'Salı',
        'wednesday': 'Çarşamba',
        'thursday': 'Perşembe',
        'friday': 'Cuma',
        'saturday': 'Cumartesi',
        'sunday': 'Pazar',
        // Büyük harfle başlayanlar için
        'Monday': 'Pazartesi',
        'Tuesday': 'Salı',
        'Wednesday': 'Çarşamba',
        'Thursday': 'Perşembe',
        'Friday': 'Cuma',
        'Saturday': 'Cumartesi',
        'Sunday': 'Pazar'
    };

    // Metindeki tüm gün isimlerini bul ve çevir
    let translatedText = text;
    Object.entries(dayTranslations).forEach(([eng, tr]) => {
        translatedText = translatedText.replace(new RegExp(eng, 'g'), tr);
    });

    return translatedText;
};

export default function StudentCourseSelectionScreen() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [courses, setCourses] = useState<ExtendedCourse[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<ExtendedCourse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [pendingCourses, setPendingCourses] = useState<ExtendedCourse[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const { addNotification } = useNotifications();
    const [snackbarStyle, setSnackbarStyle] = useState({
        backgroundColor: '#4caf50', // Varsayılan başarı rengi
        borderRadius: 8,
        marginBottom: 16,
    });

    // Component mount olduğunda selectedCourses'ı sıfırla
    useEffect(() => {
        setSelectedCourses([]);
        loadData();
    }, []);

    useEffect(() => {
        filterCourses();
    }, [searchQuery, courses]);

    const filterCourses = () => {
        if (!searchQuery.trim()) {
            setFilteredCourses(courses);
            return;
        }

        const query = searchQuery.toLowerCase().trim();
        const filtered = courses.filter(course => 
            course.name.toLowerCase().includes(query) || 
            course.code.toLowerCase().includes(query)
        );
        setFilteredCourses(filtered);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            // Önceki seçimleri temizle
            setSelectedCourses([]);
            
            // Öğrenci bilgilerini getir
            const studentProfile = await studentService.getMe();
            setProfile(studentProfile);

            // Öğrencinin mevcut ders seçimlerini getir
            const selections = await courseService.getStudentCourseSelections();
            
            // Onay bekleyen ve onaylanmış dersleri ayır
            const pendingSelections = selections.filter(selection => selection.is_approved === null);
            const approvedSelections = selections.filter(selection => selection.is_approved === true);

            // Tüm dersleri getir
            const allCourses = await courseService.getAllCourses();
            
            // Sadece academician_id'si dolu olan VE 
            // öğrencinin onaylanmış veya bekleyen seçimlerinde OLMAYAN dersleri filtrele
            const allSelectedCourseIds = [
                ...approvedSelections.map(s => s.course_id), 
                ...pendingSelections.map(s => s.course_id)
            ];

            const availableCoursesInitial = allCourses.filter(course => 
                course.academician_id && // Akademisyeni olan
                !allSelectedCourseIds.includes(course.id) // Öğrencinin seçili veya onaylı derslerinde olmayan
            );
            
            // Her bir ders için detaylı bilgileri getir
            const coursesWithDetails = await Promise.all(
                availableCoursesInitial.map(async (course) => {
                    try {
                        // Ders detaylarını getir
                        const courseDetail = await courseService.getCourseById(course.id);
                        
                        // Akademisyen bilgilerini getir
                        let academicianInfo = null;
                        if (courseDetail.academician_id) {
                            academicianInfo = await academicianService.getAcademician(courseDetail.academician_id);
                        }

                        return {
                            ...courseDetail,
                            academician: academicianInfo
                        } as ExtendedCourse;
                    } catch (error) {
                        console.error(`${course.code} kodlu dersin detayları yüklenirken hata:`, error);
                        return course as ExtendedCourse;
                    }
                })
            );
            
            // Onay bekleyen dersleri bul
            const pendingCoursesList = await Promise.all(
                pendingSelections.map(async (selection) => {
                    try {
                        const courseDetail = await courseService.getCourseById(selection.course_id);
                        let academicianInfo = null;
                        if (courseDetail.academician_id) {
                            academicianInfo = await academicianService.getAcademician(courseDetail.academician_id);
                        }
                        return {
                            ...courseDetail,
                            academician: academicianInfo
                        } as ExtendedCourse;
                    } catch (error) {
                        console.error(`Bekleyen ders detayları yüklenirken hata:`, error);
                        return null;
                    }
                })
            );

            setPendingCourses(pendingCoursesList.filter((course): course is ExtendedCourse => course !== null));
            setCourses(coursesWithDetails);
            setFilteredCourses(coursesWithDetails);
            setError(null);
        } catch (err) {
            console.error('Veriler yüklenirken hata:', err);
            setError('Veriler yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourses(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else {
                return [...prev, courseId];
            }
        });
    };

    const handleSubmit = async () => {
        if (!profile || selectedCourses.length === 0) {
            Alert.alert(
                'Uyarı',
                'Lütfen en az bir ders seçiniz',
                [{ text: 'Tamam', style: 'default' }]
            );
            return;
        }

        try {
            setSubmitting(true);

            // Seçilen tüm derslerin detaylarını al
            const selectedCoursesDetails = await Promise.all(
                selectedCourses.map(courseId => courseService.getCourseById(courseId))
            );

            // Ders seçimlerini kaydet
            await courseService.createCourseSelections({
                student_id: profile.user_id,
                course_ids: selectedCourses,
                is_approved: null
            });

            // Bildirimleri toplu gönder
            const notifications = [];

            // Öğrenciye tek bir bildirim gönder
            if (selectedCoursesDetails.length === 1) {
                notifications.push({
                    title: 'Ders Seçimi Onay Bekliyor',
                    message: `${selectedCoursesDetails[0].name} dersi seçiminiz onay bekliyor.`,
                    type: 'student' as const,
                    userId: profile.user_id,
                    relatedId: selectedCoursesDetails[0].id
                });
            } else {
                notifications.push({
                    title: 'Ders Seçimleri Onay Bekliyor',
                    message: `${selectedCoursesDetails.length} ders seçiminiz onay bekliyor.`,
                    type: 'student' as const,
                    userId: profile.user_id
                });
            }

            // Her bir dersin akademisyenine bildirim gönder
            for (const course of selectedCoursesDetails) {
                if (course.academician_id) {
                    notifications.push({
                        title: 'Yeni Ders Seçimi',
                        message: `${course.name} dersi için yeni bir öğrenci kaydı bekliyor.`,
                        type: 'academician' as const,
                        userId: course.academician_id,
                        relatedId: course.id
                    });
                }
            }

            // Bildirimleri sırayla gönder (aralarında 1 saniye bekleyerek)
            for (let i = 0; i < notifications.length; i++) {
                const notification = notifications[i];
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
                await NotificationService.sendLocalNotification(
                    notification.title,
                    notification.message,
                    notification.type,
                    notification.userId,
                    notification.relatedId
                );
            }

            // Seçilen dersleri sıfırla
            setSelectedCourses([]);
            
            // Başarı mesajını göster
            Alert.alert(
                'Başarılı',
                'Ders seçimleriniz başarıyla kaydedildi ve onay için gönderildi.',
                [{ text: 'Tamam', style: 'default' }]
            );

            // Verileri yeniden yükle
            await loadData();
        } catch (err: any) {
            // Sadece geliştirme ortamında konsola yazdır
            if (process.env.NODE_ENV === 'development') {
                console.error('Ders seçimi kaydedilirken hata:', err);
            }
            
            // API'den gelen hatayı kontrol et
            let errorTitle = 'Hata';
            let errorMessage = 'Ders seçimi kaydedilirken bir hata oluştu';
            
            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                
                // Ders çakışması durumunu kontrol et
                if (detail.includes('çakışma') || detail.includes('conflict')) {
                    errorTitle = 'Ders Çakışması';
                    // Gün isimlerini Türkçe'ye çevir
                    errorMessage = translateDay(detail);
                } else {
                    // Diğer hata mesajlarında da gün isimlerini çevir
                    errorMessage = translateDay(detail);
                }
            } else if (err.message) {
                // API hatası değilse ve err.message varsa, genel bir hata mesajı göster
                errorMessage = 'İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.';
            }
            
            Alert.alert(
                errorTitle,
                errorMessage,
                [
                    { 
                        text: 'Tamam',
                        style: 'default',
                        onPress: () => setSelectedCourses([]) // Hata durumunda seçimleri temizle
                    }
                ]
            );
        } finally {
            setSubmitting(false);
        }
    };

    const renderCourseSchedules = (schedules?: CourseSchedule[]) => {
        if (!schedules || schedules.length === 0) {
            return <Text variant="bodyMedium" style={styles.noSchedule}>Ders programı henüz belirlenmemiş</Text>;
        }

        // Benzersiz programları oluştur
        const uniqueSchedules = schedules.reduce((acc: CourseSchedule[], curr) => {
            const exists = acc.find(s => 
                s.weekday === curr.weekday && 
                s.start_time === curr.start_time && 
                s.end_time === curr.end_time
            );
            if (!exists) {
                acc.push(curr);
            }
            return acc;
        }, []);

        // Günlere göre sırala
        const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedSchedules = [...uniqueSchedules].sort((a, b) => 
            weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday)
        );

        return (
            <>
                <Text variant="titleSmall" style={styles.scheduleTitle}>Ders Programı</Text>
                {sortedSchedules.map((schedule, index) => (
                    <View key={`${schedule.id}-${index}`} style={styles.scheduleItem}>
                        <Text style={styles.weekday}>
                            {weekdayMap[schedule.weekday]}
                        </Text>
                        <Text style={styles.timeText}>
                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                        </Text>
                        <Text style={styles.location}>
                            {schedule.location || 'Konum belirtilmemiş'}
                        </Text>
                    </View>
                ))}
            </>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text variant="bodyLarge" style={styles.errorText}>{error}</Text>
                <Button mode="contained" onPress={loadData}>Tekrar Dene</Button>
            </View>
        );
    }

    return (
        <>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/images/logo_zemin1.png')}
                        style={styles.logo}
                        resizeMode="stretch"
                    />
                </View>
                <View style={styles.content}>
                    <Card style={styles.infoCard}>
                        <Card.Content>
                            <Text variant="titleLarge" style={styles.cardTitle}>Ders Seçimi</Text>
                            <Text variant="bodyMedium" style={styles.infoText}>
                                Almak istediğiniz dersleri seçin. Seçimleriniz akademisyen onayından sonra aktif olacaktır.
                            </Text>
                            <View style={styles.selectionInfo}>
                                <Text variant="bodyMedium" style={styles.selectionText}>Seçili Ders: {selectedCourses.length}</Text>
                                <Text variant="bodyMedium" style={styles.selectionText}>Onay Bekleyen: {pendingCourses.length}</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <View style={styles.sectionContainer}>
                        {pendingCourses.length > 0 && (
                            <>
                                <Text variant="titleMedium" style={styles.sectionTitle}>
                                    Onay Bekleyen Dersler
                                </Text>
                                {pendingCourses.map((course) => (
                                    <Card
                                        key={course.id}
                                        style={[styles.courseCard, styles.pendingCard]}
                                    >
                                        <Card.Content>
                                            <View>
                                                <Text variant="titleLarge" style={styles.courseName}>{course.name}</Text>
                                                <Text variant="bodyMedium" style={styles.code}>
                                                    {course.code}
                                                </Text>
                                                {course.academician && (
                                                    <Text variant="bodyMedium" style={styles.academician}>
                                                        {course.academician.first_name} {course.academician.last_name}
                                                    </Text>
                                                )}
                                                <Chip mode="flat" style={[styles.pendingChip, styles.selectChip]}>
                                                    Onay Bekliyor
                                                </Chip>
                                            </View>

                                            <View style={styles.courseInfo}>
                                                <Text variant="bodyMedium" style={styles.courseInfoText}>
                                                    Öğrenci Sayısı: {course.students?.length || 0}
                                                </Text>
                                                {renderCourseSchedules(course.schedules)}
                                            </View>
                                        </Card.Content>
                                    </Card>
                                ))}
                                <Divider style={styles.divider} />
                            </>
                        )}

                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            Mevcut Dersler
                        </Text>
                    </View>

                    <Searchbar
                        placeholder="Ders Ara..."
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={styles.searchBar}
                    />

                    {filteredCourses.map((course) => (
                        <Card
                            key={course.id}
                            style={[
                                styles.courseCard,
                                selectedCourses.includes(course.id) && styles.selectedCard
                            ]}
                            onPress={() => toggleCourseSelection(course.id)}
                        >
                            <Card.Content>
                                <View>
                                    <Text variant="titleLarge" style={styles.courseName}>{course.name}</Text>
                                    <Text variant="bodyMedium" style={styles.code}>
                                        {course.code}
                                    </Text>
                                    {course.academician && (
                                        <Text variant="bodyMedium" style={styles.academician}>
                                            {course.academician.first_name} {course.academician.last_name}
                                        </Text>
                                    )}
                                    <Chip 
                                        mode={selectedCourses.includes(course.id) ? "flat" : "outlined"}
                                        selected={selectedCourses.includes(course.id)}
                                        style={styles.selectChip}
                                        textStyle={styles.chipText}
                                    >
                                        {selectedCourses.includes(course.id) ? 'Seçildi' : 'Seç'}
                                    </Chip>
                                </View>

                                <View style={styles.courseInfo}>
                                    <Text variant="bodyMedium" style={styles.courseInfoText}>
                                        Öğrenci Sayısı: {course.students?.length || 0}
                                    </Text>
                                    {renderCourseSchedules(course.schedules)}
                                </View>
                            </Card.Content>
                        </Card>
                    ))}

                    <View style={styles.bottomSpacing} />
                </View>
            </ScrollView>
            
            <View style={styles.bottomBar}>
                <View style={styles.bottomContent}>
                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting || selectedCourses.length === 0}
                        style={styles.submitButton}
                        contentStyle={styles.submitButtonContent}
                        labelStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}
                    >
                        {submitting 
                            ? 'Kaydediliyor...' 
                            : `${selectedCourses.length} Dersi Kaydet`
                        }
                    </Button>
                </View>
            </View>
            
            <Snackbar
                visible={showSuccess}
                onDismiss={() => setShowSuccess(false)}
                duration={3000}
                style={snackbarStyle}
            >
                Ders seçimleriniz başarıyla kaydedildi
            </Snackbar>
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
    infoCard: {
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
        marginBottom: 16,
    },
    infoText: {
        marginTop: 12,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    selectionInfo: {
        marginTop: 16,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    courseCard: {
        marginBottom: 16,
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
    },
    selectedCard: {
        backgroundColor: '#11263E',
        borderWidth: 2,
        borderColor: '#D4AF37',
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    code: {
        color: '#B4B4B4',
        marginTop: 4,
    },
    academician: {
        color: '#D4AF37',
        marginTop: 4,
        fontWeight: '500',
    },
    courseInfo: {
        marginTop: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    submitButton: {
        width: '100%',
        borderRadius: 10,
        backgroundColor: '#001F3F',
    },
    submitButtonContent: {
        height: 48,
        backgroundColor: '#001F3F',
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
    errorText: {
        marginBottom: 16,
        textAlign: 'center',
        color: '#D4AF37',
    },
    searchBar: {
        marginBottom: 16,
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D4AF37',
    },
    sectionTitle: {
        marginBottom: 16,
        fontWeight: '600',
        color: '#D4AF37',
        fontSize: 32,
    },
    pendingCard: {
        backgroundColor: '#11263E',
        borderWidth: 1,
        borderColor: '#D4AF37',
    },
    pendingChip: {
        backgroundColor: '#D4AF37',
    },
    divider: {
        marginVertical: 24,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    snackbar: {
        backgroundColor: '#4caf50',
        borderRadius: 8,
        marginBottom: 16,
    },
    sectionContainer: {
        marginTop: 20,
    },
    scheduleContainer: {
        marginTop: 16,
    },
    scheduleList: {
        marginTop: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 8,
    },
    scheduleTitle: {
        color: '#D4AF37',
        fontWeight: '500',
        fontSize: 16,
        marginBottom: 8,
        marginTop: 16,
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
    timeText: {
        color: '#FFFFFF',
        fontSize: 14,
        marginBottom: 4,
    },
    location: {
        color: '#B4B4B4',
        fontSize: 12,
    },
    noSchedule: {
        fontStyle: 'italic',
        color: '#B4B4B4',
        textAlign: 'center',
        padding: 8,
        marginTop: 16,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        elevation: 8,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    bottomContent: {
        padding: 16,
    },
    bottomSpacing: {
        height: 100,
    },
    selectChip: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    cardTitle: {
        color: '#D4AF37',
        fontSize: 24,
        fontWeight: 'bold',
    },
    selectionText: {
        color: '#FFFFFF',
    },
    courseName: {
        fontSize: 24,
        color: '#D4AF37',
        fontWeight: 'bold',
    },
    chipText: {
        color: '#D4AF37',
    },
    courseInfoText: {
        color: '#FFFFFF',
    },
}); 