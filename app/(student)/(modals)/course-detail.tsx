import { attendanceService } from '@/services/attendance';
import { faceRecognitionService } from '@/services/face-recognition';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, DataTable, Divider, Text } from 'react-native-paper';
import { academicianService } from '../../../services/academician';
import { courseService } from '../../../services/course';
import { Attendance } from '../../../types/attendance';
import { AcademicianProfile } from '../../../types/auth';
import { Course, PerformanceRecord } from '../../../types/course';

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

export default function StudentCourseDetailScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [academician, setAcademician] = useState<AcademicianProfile | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [takingAttendance, setTakingAttendance] = useState(false);
    const [performanceRecord, setPerformanceRecord] = useState<PerformanceRecord | null>(null);

    useEffect(() => {
        if (courseId) {
            loadCourseData();
        }
    }, [courseId]);

    const loadCourseData = async () => {
        try {
            setLoading(true);
            const courseData = await courseService.getCourseById(courseId);
            setCourse(courseData);

            // Akademisyen bilgilerini getir
            if (courseData.academician_id) {
                const academicianData = await academicianService.getAcademician(courseData.academician_id);
                setAcademician(academicianData);
            }

            // Performans kaydını getir
            const performanceRecords = await courseService.getMyPerformanceRecords();
            const currentRecord = performanceRecords.find(record => record.course_id === courseId);
            setPerformanceRecord(currentRecord || null);

            // Yoklama bilgilerini getir
            const attendanceData = await attendanceService.getMyAttendances();
            const courseAttendances = attendanceData.filter(a => a.course_id === courseId);
            setAttendances(courseAttendances as Attendance[]);
            
            setError(null);
        } catch (err) {
            console.error('Ders detayları yüklenirken hata:', err);
            setError('Ders detayları yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleTakeAttendance = async () => {
        if (!courseId) return;

        try {
            setTakingAttendance(true);
            const response = await faceRecognitionService.identifyFace(courseId);

            // Başarılı yanıt
            Alert.alert(
                "Yoklama Durumu",
                response.message,
                [{ text: "Tamam", onPress: async () => {
                    await loadCourseData();
                    // Devam durumu kontrolü yap
                    await courseService.checkAttendanceStatus(courseId);
                }}],
                { cancelable: false }
            );

        } catch (error: any) {
            // Hata durumu
            Alert.alert(
                "Hata",
                error.response?.data?.detail || "Yoklama alınırken bir hata oluştu",
                [{ text: "Tamam" }],
                { cancelable: false }
            );
        } finally {
            setTakingAttendance(false);
        }
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
            </View>
        );
    }

    if (!course) {
        return (
            <View style={styles.errorContainer}>
                <Text variant="bodyLarge">Ders bulunamadı</Text>
            </View>
        );
    }

    return (
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
                        
                        <Button
                            mode="contained"
                            onPress={handleTakeAttendance}
                            loading={takingAttendance}
                            disabled={takingAttendance}
                            style={styles.attendanceButton}
                            buttonColor="#D4AF37"
                        >
                            {takingAttendance ? "Yoklama Alınıyor..." : "Yoklama Al"}
                        </Button>

                        <Divider style={styles.divider} />

                        <Text variant="titleMedium" style={styles.sectionTitle}>Ders Programı</Text>
                        {course.schedules && course.schedules.length > 0 ? (
                            (() => {
                                // Benzersiz programları oluştur
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

                                // Günlere göre sırala
                                const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                                const sortedSchedules = [...uniqueSchedules].sort((a, b) => 
                                    weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday)
                                );

                                return sortedSchedules.map((schedule, index) => (
                                    <View key={`${schedule.id}-${index}`} style={styles.scheduleItem}>
                                        <Text style={styles.weekday}>
                                            {getWeekdayInTurkish(schedule.weekday)}
                                        </Text>
                                        <Text style={styles.timeText}>
                                            {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                        </Text>
                                        <Text style={styles.location}>
                                            {schedule.location || 'Konum belirtilmemiş'}
                                        </Text>
                                    </View>
                                ));
                            })()
                        ) : (
                            <Text style={styles.noSchedule}>
                                Ders programı henüz belirlenmemiş
                            </Text>
                        )}

                        <Divider style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Öğretim Üyesi:</Text>
                            <Text style={styles.infoValue}>
                                {academician 
                                    ? `${academician.first_name} ${academician.last_name}`
                                    : 'Belirtilmemiş'
                                }
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Devam Zorunluluğu:</Text>
                            <Text style={styles.infoValue}>
                                {course.attendances_rate_limit 
                                    ? `%${(course.attendances_rate_limit * 100).toFixed(0)}`
                                    : 'Belirtilmemiş'
                                }
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Mevcut Katılım Oranınız:</Text>
                            <Text 
                                style={[
                                    styles.infoValue,
                                    performanceRecord && course.attendances_rate_limit 
                                        ? (performanceRecord.attendance_rate >= course.attendances_rate_limit)
                                            ? styles.goodRate
                                            : styles.badRate
                                        : null
                                ]}
                            >
                                {performanceRecord 
                                    ? `%${(performanceRecord.attendance_rate * 100).toFixed(0)}`
                                    : '%0'
                                }
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={styles.attendanceCard}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.sectionTitle}>
                            Yoklama Geçmişi
                        </Text>

                        <DataTable>
                            <DataTable.Header style={styles.tableHeader}>
                                <DataTable.Title textStyle={styles.tableHeaderText}>Tarih</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableHeaderText}>Durum</DataTable.Title>
                            </DataTable.Header>

                            {attendances.length > 0 ? (
                                attendances.map((attendance) => (
                                    <DataTable.Row key={attendance.id} style={styles.tableRow}>
                                        <DataTable.Cell textStyle={styles.tableCell}>
                                            {new Date(attendance.date).toLocaleDateString('tr-TR')}
                                        </DataTable.Cell>
                                        <DataTable.Cell textStyle={[
                                            styles.tableCell,
                                            attendance.status === null ? styles.canceledStatus :
                                            attendance.status ? styles.presentStatus : styles.absentStatus
                                        ]}>
                                            {attendance.status === null ? 'Ders İptal Edildi' :
                                             attendance.status ? 'Var' : 'Yok'}
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                ))
                            ) : (
                                <DataTable.Row style={styles.tableRow}>
                                    <DataTable.Cell textStyle={styles.tableCell}>
                                        Yoklama kaydı bulunmamaktadır
                                    </DataTable.Cell>
                                    <DataTable.Cell textStyle={styles.tableCell}>
                                        -
                                    </DataTable.Cell>
                                </DataTable.Row>
                            )}
                        </DataTable>
                    </Card.Content>
                </Card>
            </View>
        </ScrollView>
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
    attendanceButton: {
        marginVertical: 16,
        borderRadius: 10,
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
        marginVertical: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    infoLabel: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    infoValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    attendanceCard: {
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
        marginBottom: 16,
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
    goodRate: {
        color: '#4CAF50',
    },
    badRate: {
        color: '#F44336',
    },
    presentStatus: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    absentStatus: {
        color: '#F44336',
        fontWeight: 'bold',
    },
    canceledStatus: {
        color: '#FF9800',
        fontWeight: 'bold',
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
}); 