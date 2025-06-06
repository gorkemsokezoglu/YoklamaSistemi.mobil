import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { attendanceService } from '../../services/attendance';
import { courseService } from '../../services/course';
import { courseScheduleService } from '../../services/courseSchedule';
import { Student } from '../../types/course';
import { CourseSchedule } from '../../types/courseSchedule';

interface CourseWithSchedule {
    id: string;
    name: string;
    code: string;
    academician_id: string | null;
    attendance_rate?: number;
    created_at: string;
    updated_at: string;
    schedules?: CourseSchedule[];
    students?: Student[];
    attendances_rate_limit: number | null;
}

export default function MyCoursesScreen() {
    const theme = useTheme();
    const [courses, setCourses] = useState<CourseWithSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoading(true);
            // Dersleri getir
            const myCourses = await courseService.getMyCourses();
            
            // Her ders için ders programını, öğrenci listesini ve yoklama kayıtlarını getir
            const coursesWithDetails = await Promise.all(
                myCourses.map(async (course) => {
                    try {
                        const [scheduleResponse, students, attendances] = await Promise.all([
                            courseScheduleService.getCourseSchedulesByCourse(course.id),
                            courseService.getCourseStudents(course.id),
                            attendanceService.getCourseAttendances(course.id)
                        ]);

                        // Katılım oranını hesapla (İptal edilmeyen dersler için)
                        let attendance_rate = 0;
                        const activeAttendances = attendances.filter(a => a.status !== null);
                        if (activeAttendances.length > 0) {
                            const presentCount = activeAttendances.filter(a => a.status === true).length;
                            attendance_rate = (presentCount / activeAttendances.length) * 100;
                        }
                        
                        return {
                            ...course,
                            schedules: scheduleResponse,
                            students: students,
                            attendance_rate: attendance_rate
                        } as CourseWithSchedule;
                    } catch (err) {
                        console.error(`${course.name} dersi detayları yüklenirken hata:`, err);
                        return {
                            ...course,
                            schedules: [],
                            students: [],
                            attendance_rate: 0
                        } as CourseWithSchedule;
                    }
                })
            );

            setCourses(coursesWithDetails);
            setError(null);
        } catch (err) {
            console.error('Dersler yüklenirken hata:', err);
            setError('Dersler yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const formatSchedule = (schedules?: CourseSchedule[]) => {
        if (!schedules || schedules.length === 0) {
            return 'Program Yok';
        }
        
        // Türkçe gün isimleri
        const weekdayMap: { [key: string]: string } = {
            'Monday': 'Pzt',
            'Tuesday': 'Sal',
            'Wednesday': 'Çar',
            'Thursday': 'Per',
            'Friday': 'Cum',
            'Saturday': 'Cmt',
            'Sunday': 'Paz'
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
        
        return uniqueSchedules.map(schedule => {
            const shortDay = weekdayMap[schedule.weekday] || schedule.weekday;
            return `${shortDay} ${schedule.start_time.slice(0, 5)}-${schedule.end_time.slice(0, 5)}`;
        }).join(', ');
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

    if (error) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
                <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
                <Text variant="bodyLarge" style={[styles.errorText, { color: theme.colors.error }]}>
                    {error}
                </Text>
                <Button 
                    mode="contained" 
                    onPress={loadCourses}
                    style={styles.retryButton}
                >
                    Tekrar Dene
                </Button>
            </View>
        );
    }

    if (courses.length === 0) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
                <Text variant="bodyLarge" style={{ color: '#11263E', fontSize: 16, fontWeight: 'bold' }}>
                    Henüz ders bulunmamaktadır.
                </Text>
                <Button 
                    mode="contained" 
                    onPress={() => router.push('/(academician)/course-selection')}
                    style={styles.retryButton}
                    buttonColor="#001F3F"
                    textColor="#FFFFFF"
                >
                    Ders Seç
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <StatusBar backgroundColor="#11263E" barStyle="light-content" translucent={false} />
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
                            <View style={styles.headerContent}>
                                <MaterialCommunityIcons 
                                    name="book-education" 
                                    size={24} 
                                    color="#D4AF37"
                                    style={styles.headerIcon}
                                />
                                <Text style={styles.sectionTitle}>Derslerim</Text>
                            </View>
                            <Text style={styles.infoText}>
                                Aktif derslerinizi ve detaylarını görüntüleyebilirsiniz.
                            </Text>
                        </Card.Content>
                    </Card>

                    {courses.map((course) => (
                        <Card
                            key={course.id}
                            style={styles.courseCard}
                            onPress={() => handleCoursePress(course.id)}
                        >
                            <Card.Content>
                                <View style={styles.courseHeader}>
                                    <View style={styles.courseInfo}>
                                        <Text style={styles.courseName}>{course.name}</Text>
                                        <Text style={styles.courseCode}>{course.code}</Text>
                                    </View>
                                    <Chip 
                                        mode="outlined" 
                                        style={styles.scheduleChip}
                                        textStyle={{ color: '#D4AF37' }}
                                    >
                                        <MaterialCommunityIcons 
                                            name="clock-outline" 
                                            size={16} 
                                            color="#D4AF37"
                                        />
                                        {' '}{formatSchedule(course.schedules)}
                                    </Chip>
                                </View>

                                <View style={styles.courseStats}>
                                    <View style={styles.stat}>
                                        <MaterialCommunityIcons 
                                            name="account-group" 
                                            size={24} 
                                            color="#D4AF37"
                                        />
                                        <Text style={styles.statNumber}>{course.students?.length || 0}</Text>
                                        <Text style={styles.statLabel}>Öğrenci</Text>
                                    </View>
                                    <View style={styles.stat}>
                                        <MaterialCommunityIcons 
                                            name="chart-line" 
                                            size={24} 
                                            color="#D4AF37"
                                        />
                                        <Text style={styles.statNumber}>%{course.attendance_rate?.toFixed(0) || 0}</Text>
                                        <Text style={styles.statLabel}>Katılım</Text>
                                    </View>
                                </View>

                                <View style={styles.actions}>
                                    <Button
                                        mode="contained"
                                        onPress={() => handleCoursePress(course.id)}
                                        style={styles.actionButton}
                                        icon="information"
                                        buttonColor="#001F3F"
                                        textColor="#FFFFFF"
                                    >
                                        Detaylar
                                    </Button>
                                    <Button
                                        mode="outlined"
                                        onPress={() => {}}
                                        style={styles.actionButton}
                                        icon="clipboard-check"
                                        textColor="#D4AF37"
                                    >
                                        Yoklama Al
                                    </Button>
                                </View>
                            </Card.Content>
                        </Card>
                    ))}
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
    content: {
        padding: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    headerIcon: {
        marginRight: 10,
    },
    infoCard: {
        backgroundColor: '#11263E',
        borderRadius: 15,
        elevation: 3,
        marginBottom: 20,
    },
    infoText: {
        color: '#FFFFFF',
        marginBottom: 15,
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D4AF37',
        marginBottom: 5,
    },
    courseCard: {
        backgroundColor: '#11263E',
        marginBottom: 15,
        borderRadius: 15,
        elevation: 3,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    courseInfo: {
        flex: 1,
        marginRight: 15,
    },
    courseName: {
        fontSize: 18,
        color: '#D4AF37',
        marginBottom: 5,
    },
    courseCode: {
        fontSize: 14,
        color: '#B4B4B4',
    },
    scheduleChip: {
        borderRadius: 20,
        borderColor: '#D4AF37',
        backgroundColor: 'transparent',
    },
    courseStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 15,
        backgroundColor: '#11263E',
        padding: 15,
        borderRadius: 10,
    },
    stat: {
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
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 15,
    },
    actionButton: {
        flex: 1,
        borderRadius: 10,
        borderColor: '#D4AF37',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#D4AF37',
        marginVertical: 15,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 10,
        borderRadius: 10,
        backgroundColor: '#11263E',
    },
}); 