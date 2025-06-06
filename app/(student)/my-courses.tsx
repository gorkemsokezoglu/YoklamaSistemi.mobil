import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Divider, Text } from 'react-native-paper';
import { courseService } from '../../services/course';
import { Course, PerformanceRecord } from '../../types/course';

// Türkçe gün isimleri için yardımcı fonksiyon
const getWeekdayInTurkish = (weekday: string) => {
    const days: { [key: string]: string } = {
        'Monday': 'Pazartesi',
        'Tuesday': 'Salı',
        'Wednesday': 'Çarşamba',
        'Thursday': 'Perşembe',
        'Friday': 'Cuma',
        'Saturday': 'Cumartesi',
        'Sunday': 'Pazar'
    };
    return days[weekday] || weekday;
};

export default function StudentMyCoursesScreen() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const loadData = async () => {
                try {
                    setLoading(true);
                    // Önce onaylanmış ders seçimlerini al
                    const selections = await courseService.getStudentCourseSelections();
                    const approvedCourseIds = selections
                        .filter(selection => selection.is_approved === true)
                        .map(selection => selection.course_id);

                    // Her bir ders ID'si için ders detaylarını getir
                    const courseDetails = await Promise.all(
                        approvedCourseIds.map(id => courseService.getCourseById(id))
                    );

                    // Performans kayıtlarını getir
                    const records = await courseService.getMyPerformanceRecords();

                    if (isActive) {
                        setPerformanceRecords(records);
                        setCourses(courseDetails);
                        setError(null);
                    }
                } catch (err) {
                    console.error('Dersler yüklenirken hata:', err);
                    if (isActive) {
                        setError('Dersler yüklenirken bir hata oluştu');
                    }
                } finally {
                    if (isActive) {
                        setLoading(false);
                    }
                }
            };

            loadData();

            return () => {
                isActive = false;
            };
        }, [])
    );

    // Belirli bir ders için performans kaydını bul
    const getAttendanceRate = (courseId: string): number => {
        const record = performanceRecords.find(r => r.course_id === courseId);
        return record ? record.attendance_rate * 100 : 0; // Decimal'i yüzdeye çevir
    };

    const handleCoursePress = (courseId: string) => {
        router.push(`/(student)/(modals)/course-detail?courseId=${courseId}`);
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
                <Button mode="contained" onPress={() => router.push('/(student)/course-selection')}>Tekrar Dene</Button>
            </View>
        );
    }

    if (courses.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={{ color: '#11263E', fontSize: 16, fontWeight: 'bold' }}>
                    Onaylanmış ders bulunmamaktadır.
                </Text>
                <Button 
                    mode="contained" 
                    onPress={() => router.push('/(student)/course-selection')}
                    style={styles.addButton}
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
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/images/logo_zemin1.png')}
                        style={styles.logo}
                        resizeMode="stretch"
                    />
                </View>
                <View style={styles.titleContainer}>
                    <Text style={styles.sectionTitle}>Derslerim</Text>
                    <Button 
                        mode="contained" 
                        onPress={() => router.push('/(student)/course-selection')}
                        style={styles.addButton}
                        buttonColor="#001F3F"
                        textColor="#FFFFFF"
                    >
                        Ders Seç
                    </Button>
                </View>
                <View style={styles.content}>
                    {courses.map((course) => (
                        <Card
                            key={course.id}
                            style={[
                                styles.courseCard,
                                course.attendances_rate_limit && 
                                getAttendanceRate(course.id) < course.attendances_rate_limit * 100 
                                ? styles.warningCard 
                                : null
                            ]}
                            onPress={() => handleCoursePress(course.id)}
                        >
                            <Card.Content>
                                <View style={styles.courseHeader}>
                                    <View>
                                        <Text variant="titleLarge" style={styles.courseName}>{course.name}</Text>
                                        <Text variant="bodyMedium" style={styles.code}>
                                            {course.code}
                                        </Text>
                                    </View>
                                </View>

                                <Divider style={styles.divider} />

                                <View style={styles.scheduleContainer}>
                                    <Text variant="titleSmall" style={styles.scheduleTitle}>Ders Programı</Text>
                                    {course.schedules && course.schedules.length > 0 ? (
                                        (() => {
                                            const uniqueSchedules = course.schedules.reduce((acc: any[], curr) => {
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

                                            const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                                            const sortedSchedules = [...uniqueSchedules].sort((a, b) => 
                                                weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday)
                                            );

                                            return sortedSchedules.map((schedule, index) => (
                                                <View key={`${schedule.id}-${index}`} style={styles.scheduleItem}>
                                                    <Text variant="bodyMedium" style={styles.weekday}>
                                                        {getWeekdayInTurkish(schedule.weekday)}
                                                    </Text>
                                                    <Text variant="bodyMedium" style={{ color: '#FFFFFF' }}>
                                                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                                    </Text>
                                                    <Text variant="bodySmall" style={styles.location}>
                                                        {schedule.location || 'Konum belirtilmemiş'}
                                                    </Text>
                                                </View>
                                            ));
                                        })()
                                    ) : (
                                        <Text variant="bodyMedium" style={styles.noSchedule}>
                                            Ders programı henüz belirlenmemiş
                                        </Text>
                                    )}
                                </View>

                                <View style={styles.courseStats}>
                                    <View style={styles.stat}>
                                        <Text style={styles.statLabel}>Katılım</Text>
                                        <Text 
                                            style={[
                                                styles.statNumber,
                                                course.attendances_rate_limit && 
                                                getAttendanceRate(course.id) < course.attendances_rate_limit * 100
                                                    ? styles.warningText
                                                    : styles.normalText
                                            ]}
                                        >
                                            %{getAttendanceRate(course.id).toFixed(0)}
                                        </Text>
                                    </View>
                                    {course.attendances_rate_limit && (
                                        <View style={styles.stat}>
                                            <Text style={styles.statLabel}>Gerekli Oran</Text>
                                            <Text style={styles.statNumber}>
                                                %{(course.attendances_rate_limit * 100).toFixed(0)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Button
                                    mode="contained"
                                    onPress={() => handleCoursePress(course.id)}
                                    style={styles.detailButton}
                                    buttonColor="#001F3F"
                                    textColor="#FFFFFF"
                                >
                                    Detaylar
                                </Button>
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
    content: {
        padding: 20,
    },
    courseCard: {
        backgroundColor: '#11263E',
        marginBottom: 15,
        borderRadius: 15,
        elevation: 3,
    },
    warningCard: {
        backgroundColor: '#11263E',
        borderWidth: 1,
        borderColor: '#D4AF37',
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    courseName: {
        fontSize: 18,
        color: '#D4AF37',
        marginBottom: 5,
    },
    code: {
        fontSize: 14,
        color: '#B4B4B4',
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
    scheduleContainer: {
        marginTop: 16,
    },
    scheduleTitle: {
        color: '#D4AF37',
        fontWeight: '500',
        marginBottom: 8,
        fontSize: 16,
    },
    scheduleItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    weekday: {
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    location: {
        color: '#B4B4B4',
        marginTop: 4,
    },
    noSchedule: {
        fontStyle: 'italic',
        color: '#B4B4B4',
    },
    warningText: {
        color: '#D4AF37',
        marginTop: 8,
        textAlign: 'center',
    },
    normalText: {
        color: '#4CAF50',
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
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    detailButton: {
        marginTop: 16,
        borderRadius: 10,
        backgroundColor: '#001F3F',
    },
    divider: {
        marginVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    addButton: {
        marginTop: 16,
        borderRadius: 10,
        backgroundColor: '#001F3F',
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
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#D4AF37',
    },
}); 