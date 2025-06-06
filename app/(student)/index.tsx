import { attendanceService } from '@/services/attendance';
import { courseService } from '@/services/course';
import { courseScheduleService } from '@/services/courseSchedule';
import { studentService } from '@/services/student';
import { StudentProfile } from '@/types/auth';
import { Course } from '@/types/course';
import { CourseSchedule } from '@/types/courseSchedule';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Card, Text, useTheme } from 'react-native-paper';

interface CourseWithSchedule extends Omit<Course, 'schedules'> {
    schedules?: CourseSchedule[];
    todaySchedule: CourseSchedule & {
        classroom?: string;
    };
}

export default function StudentHomeScreen() {
    const theme = useTheme();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalAttendance: 0,
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
                    const [profileData, coursesData] = await Promise.all([
                        studentService.getMe(),
                        courseService.getStudentCourseSelections()
                    ]);

                    if (!isActive) return;

                    setProfile(profileData);

                    // Onaylanmış dersleri filtrele
                    const approvedCourses = coursesData.filter(course => course.is_approved === true);
                    
                    // İstatistikleri hesapla
                    const attendances = await attendanceService.getMyAttendances();
                    
                    if (!isActive) return;

                    // Sadece geçerli yoklamaları say (iptal edilmemiş dersler)
                    const validAttendances = attendances.filter(a => a.status !== null);
                    // Var olan yoklamalar (status === true)
                    const totalPresent = validAttendances.filter(a => a.status === true).length;
                    
                    // Ortalama katılımı hesapla (iptal edilen dersler hariç)
                    const averageAttendance = validAttendances.length > 0 
                        ? Math.round((totalPresent / validAttendances.length) * 100)
                        : 0;

                    if (isActive) {
                        setStats({
                            totalCourses: approvedCourses.length,
                            totalAttendance: totalPresent,
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
                    // Onaylanmış ders seçimlerini al
                    const selections = await courseService.getStudentCourseSelections();
                    const approvedCourseIds = selections
                        .filter(selection => selection.is_approved === true)
                        .map(selection => selection.course_id);

                    // Her bir ders için ders programını getir
                    const coursesWithSchedules = await Promise.all(
                        approvedCourseIds.map(async (courseId) => {
                            try {
                                const course = await courseService.getCourseById(courseId);
                                const schedules = await courseScheduleService.getCourseSchedulesByCourse(courseId);
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

    const getTodayDate = () => {
        const today = new Date();
        return today.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleCoursePress = (courseId: string) => {
        router.push(`/(student)/(modals)/course-detail?courseId=${courseId}`);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar backgroundColor="#001F3F" barStyle="light-content" translucent={false} />
                <ActivityIndicator size="large" color="#D4AF37" />
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
            <StatusBar backgroundColor="#001F3F" barStyle="light-content" translucent={false} />
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
                            <Text style={styles.profileText}>Öğrenci Numarası: {profile?.student_number}</Text>
                            <Text style={styles.profileText}>Bölüm: {profile?.department}</Text>
                            <Text style={styles.profileText}>
                                Sınıf: {profile?.class_ === 'hazirlik' ? 'Hazırlık' : `${profile?.class_}. Sınıf`}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="book-education" size={24} color="#D4AF37" />
                                <Text style={styles.statNumber}>{stats.totalCourses}</Text>
                                <Text style={styles.statLabel}>Toplam Ders</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="calendar-check" size={24} color="#D4AF37" />
                                <Text style={styles.statNumber}>{stats.totalAttendance}</Text>
                                <Text style={styles.statLabel}>Toplam Katılım</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <Card style={styles.statsCard}>
                        <Card.Content>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="percent" size={24} color="#D4AF37" />
                                <Text style={styles.statNumber}>{stats.averageAttendance}%</Text>
                                <Text style={styles.statLabel}>Ortalama Katılım</Text>
                            </View>
                        </Card.Content>
                    </Card>
                </View>

                <View style={styles.coursesSection}>
                    <Text style={styles.sectionTitle}>Bugünkü Dersler</Text>
                    <Text style={styles.dateTitle}>{getTodayDate()}</Text>
                    {todayCourses.length > 0 ? (
                        todayCourses.map((course, index) => (
                            <Card
                                key={course.id}
                                style={[
                                    styles.courseCard,
                                    index === todayCourses.length - 1 && { marginBottom: 0 }
                                ]}
                                onPress={() => router.push(`/(student)/(modals)/course-detail?courseId=${course.id}`)}
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
                    ) : (
                        <Card style={styles.noCourseCard}>
                            <Card.Content>
                                <Text style={styles.noCourseText}>Bugün dersiniz bulunmamaktadır.</Text>
                            </Card.Content>
                        </Card>
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
        backgroundColor: '#001F3F',
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
        backgroundColor: '#001F3F',
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
        backgroundColor: '#001F3F',
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
        backgroundColor: '#001F3F',
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
        backgroundColor: '#0A2744',
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
        backgroundColor: '#0A2744',
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
}); 