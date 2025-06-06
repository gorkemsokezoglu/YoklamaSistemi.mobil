import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Card, Text, useTheme } from 'react-native-paper';
import { academicianService } from '../../services/academician';
import { attendanceService } from '../../services/attendance';
import { courseService } from '../../services/course';
import { courseScheduleService } from '../../services/courseSchedule';
import { AcademicianProfile } from '../../types/auth';
import { Course, Student } from '../../types/course';
import { CourseSchedule } from '../../types/courseSchedule';

interface CourseSelection {
    id: string;
    student_id: string;
    course_id: string;
    is_approved: boolean | null;
    created_at: string;
}

interface AttendanceRecord {
    id: string;
    student_id: string;
    course_id: string;
    date: string;
    status: boolean;
}

interface ExtendedCourse extends Omit<Course, 'students'> {
    course_selections?: CourseSelection[];
    attendance_records?: AttendanceRecord[];
    students?: Student[];
}

interface CourseWithSchedule extends Omit<Course, 'schedules'> {
    schedules?: CourseSchedule[];
    todaySchedule?: CourseSchedule;
}

export default function AcademicianHomeScreen() {
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<AcademicianProfile | null>(null);
    const [courses, setCourses] = useState<ExtendedCourse[]>([]);
    const [stats, setStats] = useState({
        activeCourses: 0,
        totalStudents: 0,
        averageAttendance: 0
    });
    const [todayCourses, setTodayCourses] = useState<CourseWithSchedule[]>([]);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadAllData = async () => {
                try {
                    setLoading(true);
                    
                    // Profil ve ders verilerini getir
                    const profileData = await academicianService.getMe();
                    if (!isActive) return;
                    setProfile(profileData);

                    // Tüm dersleri ve her dersin detaylı bilgilerini getir
                    const coursesData = await courseService.getMyCourses();
                    const coursesWithDetails = await Promise.all(
                        coursesData.map(async (course) => {
                            try {
                                // Her ders için detaylı bilgileri getir
                                const courseDetail = await courseService.getCourseById(course.id);
                                // Her dersin öğrenci listesini getir
                                const students = await courseService.getCourseStudents(course.id);
                                return {
                                    ...courseDetail,
                                    students: students
                                } as ExtendedCourse;
                            } catch (error) {
                                console.error(`${course.code} kodlu dersin detayları yüklenirken hata:`, error);
                                return {
                                    ...course,
                                    students: []
                                } as ExtendedCourse;
                            }
                        })
                    );

                    if (!isActive) return;
                    setCourses(coursesWithDetails);

                    // İstatistikleri hesapla
                    const activeCourses = coursesWithDetails.length;
                    
                    // Onaylanmış öğrenci sayısını hesapla
                    const totalStudents = coursesWithDetails.reduce((acc, course) => {
                        return acc + (course.students?.length || 0);
                    }, 0);

                    // Son 30 günlük ortalama katılım oranını hesapla
                    let totalAttendanceRate = 0;
                    let coursesWithAttendance = 0;

                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    await Promise.all(
                        coursesWithDetails.map(async (course) => {
                            try {
                                // Son 30 günlük yoklama kayıtlarını getir
                                const attendances = await attendanceService.getCourseAttendances(course.id);
                                
                                // Son 30 gün içindeki aktif kayıtları filtrele (iptal edilmeyenler)
                                const recentAttendances = attendances.filter(attendance => {
                                    const attendanceDate = new Date(attendance.date);
                                    return attendanceDate >= thirtyDaysAgo && attendance.status !== null;
                                });

                                if (recentAttendances.length > 0) {
                                    // Katılım oranını hesapla (sadece var olanlar)
                                    const presentCount = recentAttendances.filter(a => a.status === true).length;
                                    const attendanceRate = (presentCount / recentAttendances.length) * 100;
                                    
                                    totalAttendanceRate += attendanceRate;
                                    coursesWithAttendance++;
                                }
                            } catch (error) {
                                console.error(`${course.code} dersi yoklama istatistikleri yüklenirken hata:`, error);
                            }
                        })
                    );

                    const averageAttendance = coursesWithAttendance > 0
                        ? Math.round(totalAttendanceRate / coursesWithAttendance)
                        : 0;

                    if (isActive) {
                        setStats({
                            activeCourses,
                            totalStudents,
                            averageAttendance
                        });
                    }
                } catch (error) {
                    console.error('Veri yüklenirken hata:', error);
                    if (isActive) {
                        setError('Veriler yüklenirken bir hata oluştu');
                    }
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            const loadTodayCoursesData = async () => {
                try {
                    const coursesData = await courseService.getMyCourses();
                    
                    // Her bir ders için ders programını getir
                    const coursesWithSchedules = await Promise.all(
                        coursesData.map(async (course) => {
                            try {
                                const schedules = await courseScheduleService.getCourseSchedulesByCourse(course.id);
                                return {
                                    ...course,
                                    schedules
                                } as CourseWithSchedule;
                            } catch (err) {
                                console.error(`Ders programı yüklenirken hata:`, err);
                                return null;
                            }
                        })
                    );

                    if (!isActive) return;

                    // Bugünün gününü al
                    const today = new Date();
                    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const todayWeekday = weekdays[today.getDay()];

                    // Bugünkü dersleri filtrele ve sırala
                    const todaySchedules = coursesWithSchedules
                        .filter(course => course !== null)
                        .map(course => {
                            const todaySchedule = course?.schedules?.find(
                                schedule => schedule.weekday === todayWeekday
                            );
                            if (todaySchedule) {
                                return {
                                    ...course,
                                    todaySchedule
                                };
                            }
                            return null;
                        })
                        .filter((course): course is NonNullable<CourseWithSchedule & { todaySchedule: CourseSchedule }> => 
                            course !== null
                        )
                        .sort((a, b) => {
                            const timeA = a.todaySchedule.start_time;
                            const timeB = b.todaySchedule.start_time;
                            return timeA.localeCompare(timeB);
                        });

                    if (isActive) {
                        setTodayCourses(todaySchedules);
                    }
                } catch (error) {
                    console.error('Bugünkü dersler yüklenirken hata:', error);
                }
            };

            loadAllData();
            loadTodayCoursesData();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const formatTime = (time?: string) => {
        if (!time) return '';
        return time.slice(0, 5); // "HH:mm" formatında göster
    };

    const formatWeekday = (weekday: string) => {
        const weekdayMap: { [key: string]: string } = {
            'Monday': 'Pazartesi',
            'Tuesday': 'Salı',
            'Wednesday': 'Çarşamba',
            'Thursday': 'Perşembe',
            'Friday': 'Cuma',
            'Saturday': 'Cumartesi',
            'Sunday': 'Pazar'
        };
        return weekdayMap[weekday] || weekday;
    };

    const getTodayDate = () => {
        const today = new Date();
        return today.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleCoursePress = (courseId: string) => {
        router.push(`/(academician)/(modals)/_course-detail?courseId=${courseId}`);
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    headerShown: false,
                    statusBarTranslucent: false,
                    animation: 'none',
                }}
            />
            <StatusBar backgroundColor="#11263E" barStyle="light-content" translucent={false} />
            <ScrollView 
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/images/logo_zemin1.png')}
                        style={styles.logo}
                        resizeMode="stretch"
                    />
                </View>

                <View style={styles.profileCard}>
                    <View style={styles.profileInfo}>
                        <View style={styles.profileImageContainer}>
                            <MaterialCommunityIcons name="account" size={40} color="#D4AF37" />
                        </View>
                        <View style={styles.profileDetails}>
                            <Text style={styles.profileName}>{profile?.first_name} {profile?.last_name}</Text>
                            <Text style={styles.profileText}>Akademisyen</Text>
                            <Text style={styles.profileText}>Bölüm: {profile?.department}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="book-education" size={24} color="#D4AF37" />
                                <Text style={styles.statNumber}>{stats.activeCourses}</Text>
                                <Text style={styles.statLabel}>Aktif Ders</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="account-group" size={24} color="#D4AF37" />
                                <Text style={styles.statNumber}>{stats.totalStudents}</Text>
                                <Text style={styles.statLabel}>Toplam Öğrenci</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="chart-line" size={24} color="#D4AF37" />
                                <Text style={styles.statNumber}>{stats.averageAttendance}%</Text>
                                <Text style={styles.statLabel}>Ortalama Katılım</Text>
                            </View>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.quickActions}>
                    <Card style={styles.actionCard} onPress={() => router.push('/(academician)/my-courses')}>
                        <Card.Content style={styles.actionCardContent}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={32} color="#D4AF37" />
                            <Text style={styles.profileText}>Derslerim</Text>
                            <Text style={styles.actionCardDescription}>
                                Tüm derslerinizi görüntüleyin ve yönetin
                            </Text>
                        </Card.Content>
                    </Card>

                    <Card style={styles.actionCard} onPress={() => router.push('/(academician)/profile')}>
                        <Card.Content style={styles.actionCardContent}>
                            <MaterialCommunityIcons name="account-circle" size={32} color="#D4AF37" />
                            <Text style={styles.profileText}>Profil</Text>
                            <Text style={styles.actionCardDescription}>
                                Profil bilgilerinizi düzenleyin
                            </Text>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.coursesSection}>
                    <Text style={styles.sectionTitle}>Bugünkü Dersler</Text>
                    <Text style={styles.dateTitle}>{getTodayDate()}</Text>

                    {error ? (
                        <View style={styles.errorContainer}>
                            <MaterialCommunityIcons name="alert-circle" size={48} color="#D4AF37" />
                            <Text style={styles.errorText}>
                                {error}
                            </Text>
                        </View>
                    ) : todayCourses.length === 0 ? (
                        <Card style={styles.noCourseCard}>
                            <Card.Content>
                                <Text style={styles.noCourseText}>
                                    Bugün programınızda ders bulunmuyor.
                                </Text>
                            </Card.Content>
                        </Card>
                    ) : (
                        todayCourses.map((course, index) => (
                            <Card
                                key={course.id}
                                style={[
                                    styles.courseCard,
                                    index === todayCourses.length - 1 && { marginBottom: 0 }
                                ]}
                                onPress={() => router.push(`/(academician)/(modals)/_course-detail?courseId=${course.id}`)}
                            >
                                <Card.Content style={styles.courseContent}>
                                    <View style={styles.courseInfo}>
                                        <Text variant="titleMedium" style={styles.courseTitle}>
                                            {course.name}
                                        </Text>
                                        <Text variant="bodyMedium" style={styles.courseCode}>
                                            {course.code}
                                        </Text>
                                        <Text variant="bodyMedium" style={styles.courseTime}>
                                            {formatTime(course.todaySchedule?.start_time)} - {formatTime(course.todaySchedule?.end_time)}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons 
                                        name="chevron-right" 
                                        size={24} 
                                        color="#D4AF37" 
                                    />
                                </Card.Content>
                            </Card>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
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
    profileCard: {
        backgroundColor: '#11263E',
        borderRadius: 15,
        padding: 15,
        marginHorizontal: 20,
        marginVertical: 15,
        elevation: 3,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#11263E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    profileDetails: {
        flex: 1,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D4AF37',
        marginBottom: 5,
    },
    profileText: {
        fontSize: 14,
        color: '#D4AF37',
        marginBottom: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 20,
    },
    statsCard: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#11263E',
        borderRadius: 15,
        elevation: 3,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginVertical: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#B4B4B4',
        textAlign: 'center',
    },
    coursesSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#D4AF37',
        marginBottom: 5,
    },
    dateTitle: {
        fontSize: 24,
        color: '#D4AF37',
        marginBottom: 20,
    },
    courseCard: {
        backgroundColor: '#11263E',
        marginBottom: 15,
        borderRadius: 15,
        elevation: 3,
    },
    courseContent: {
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    courseInfo: {
        flex: 1,
    },
    courseTitle: {
        fontSize: 24,
        color: '#D4AF37',
        fontWeight: 'bold',
    },
    courseCode: {
        fontSize: 14,
        color: '#D4AF37',
    },
    courseTime: {
        fontSize: 14,
        color: '#D4AF37',
    },
    noCourseCard: {
        backgroundColor: '#11263E',
        borderRadius: 15,
    },
    noCourseText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 20,
    },
    actionCard: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: '#11263E',
        borderRadius: 15,
        elevation: 3,
    },
    actionCardContent: {
        alignItems: 'center',
        padding: 15,
    },
    actionCardDescription: {
        color: '#B4B4B4',
        textAlign: 'center',
        marginTop: 5,
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
    },
    errorText: {
        color: '#D4AF37',
        marginVertical: 15,
        textAlign: 'center',
    },
}); 