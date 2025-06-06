import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip, Divider, Searchbar, Surface, Text, useTheme } from 'react-native-paper';
import { useNotifications } from '../../contexts/NotificationContext';
import { courseService } from '../../services/course';
import NotificationService from '../../services/NotificationService';
import { Course } from '../../types/course';

export default function CourseSelection() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addNotification } = useNotifications();
  const theme = useTheme();

  const getProcessedNotifications = async () => {
    try {
      const key = `processed_notifications_${userId}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('İşlenmiş bildirimler alınırken hata:', error);
      return [];
    }
  };

  const saveProcessedNotification = async (courseId: string) => {
    try {
      const key = `processed_notifications_${userId}`;
      const processed = await getProcessedNotifications();
      if (!processed.includes(courseId)) {
        processed.push(courseId);
        await AsyncStorage.setItem(key, JSON.stringify(processed));
      }
    } catch (error) {
      console.error('Bildirim kaydedilirken hata:', error);
    }
  };

  const sendNotification = async (course: Course, isApproved: boolean) => {
    if (!userId) return;

    const title = isApproved ? 'Ders Seçimi Onaylandı' : 'Ders Seçimi Reddedildi';
    const message = isApproved
      ? `${course.name} dersi seçiminiz yönetici tarafından onaylandı.`
      : `${course.name} dersi seçiminiz yönetici tarafından reddedildi.`;

    try {
      addNotification({
        title,
        message,
        type: 'academician',
        relatedId: course.id,
        userId: userId
      });

      await NotificationService.sendCustomNotification(
        title,
        message,
        true,
        course.id
      );

      await saveProcessedNotification(course.id);
    } catch (error) {
      console.error('Bildirim gönderilirken hata:', error);
    }
  };

  const fetchAvailableCourses = async (currentUserId: string) => {
    if (!currentUserId) {
      console.error('UserId bulunamadı');
      return;
    }

    try {
      setLoading(true);
      console.log('Dersler yükleniyor... UserId:', currentUserId);
      
      const allCourses = await courseService.getAllCourses();
      const academicianSelections = await courseService.getAcademicianCourseSelections();
      const processedNotifications = await getProcessedNotifications();
      
      const pendingSelections = academicianSelections.filter(
        selection => selection.academician_id === currentUserId && selection.is_approved === null
      );

      const processedSelections = academicianSelections.filter(
        selection => 
          selection.academician_id === currentUserId && 
          selection.is_approved !== null &&
          !processedNotifications.includes(selection.course_id)
      );

      for (const selection of processedSelections) {
        try {
          const course = await courseService.getCourseById(selection.course_id);
          await sendNotification(course, selection.is_approved === true);
        } catch (error) {
          console.error('Bildirim gönderilirken hata:', error);
        }
      }

      const pendingCoursesList = await Promise.all(
        pendingSelections.map(async (selection) => {
          try {
            const courseDetails = await courseService.getCourseById(selection.course_id);
            return courseDetails;
          } catch (error) {
            console.error(`Ders detayları alınamadı (ID: ${selection.course_id}):`, error);
            return null;
          }
        })
      );

      const validPendingCourses = pendingCoursesList.filter(course => course !== null) as Course[];
      setPendingCourses(validPendingCourses);

      const approvedAndPendingSelections = academicianSelections.filter(selection => 
        selection.is_approved === true || 
        (selection.academician_id !== currentUserId && selection.is_approved === null)
      );

      const unavailableCourseIds = approvedAndPendingSelections.map(selection => selection.course_id);
      
      const availableCourses = allCourses.filter(course => 
        course.academician_id === null && 
        !unavailableCourseIds.includes(course.id)
      );
      
      setCourses(availableCourses);
    } catch (error) {
      console.error('Dersler yüklenirken hata:', error);
      Alert.alert('Hata', 'Dersler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (!token) {
            Alert.alert('Hata', 'Oturum bilgisi bulunamadı');
            return;
          }

          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentUserId = payload.sub;
          
          if (isActive) {
            setUserId(currentUserId);
            await fetchAvailableCourses(currentUserId);
          }
        } catch (error) {
          console.error('Veri yüklenirken hata:', error);
          if (isActive) {
            Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
          }
        }
      };

      loadData();

      return () => {
        isActive = false;
        setSelectedCourses([]);
        setSearchQuery('');
      };
    }, [])
  );

  useEffect(() => {
    filterCourses();
  }, [searchQuery, courses]);

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
    if (!userId) {
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
      return;
    }

    if (selectedCourses.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir ders seçiniz.');
      return;
    }

    try {
      setSubmitting(true);
      
      const selectedCoursesDetails = await Promise.all(
        selectedCourses.map(courseId => courseService.getCourseById(courseId))
      );

      for (const course of selectedCoursesDetails) {
        await courseService.createAcademicianCourseSelection({
          academician_id: userId,
          course_id: course.id,
          is_approved: null
        });

        await NotificationService.sendCustomNotification(
          'Ders Seçimi Yapıldı',
          `${course.name} dersi için seçim yaptınız. Yönetici onayı bekleniyor.`,
          true,
          course.id
        );

        addNotification({
          title: 'Ders Seçimi Yapıldı',
          message: `${course.name} dersi için seçiminiz yönetici onayı bekliyor.`,
          type: 'academician',
          relatedId: course.id,
          userId: userId
        });
      }

      Alert.alert('Başarılı', 'Ders seçimleriniz kaydedildi ve onay için gönderildi.');
      setSelectedCourses([]);
      if (userId) {
        await fetchAvailableCourses(userId);
      }
    } catch (error) {
      Alert.alert('Hata', 'Ders seçimleri kaydedilirken bir hata oluştu.');
      console.error('Error saving course selections:', error);
    } finally {
      setSubmitting(false);
    }
  };

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

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
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
      <StatusBar backgroundColor="#001F3F" barStyle="light-content" translucent={false} />
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
                  name="book-plus" 
                  size={24} 
                  color="#D4AF37"
                  style={styles.headerIcon}
                />
                <Text style={styles.sectionTitle}>Ders Seçimi</Text>
              </View>
              <Text style={styles.infoText}>
                Vermek istediğiniz dersleri seçin. Seçimleriniz yönetici onayından sonra aktif olacaktır.
              </Text>
              <View style={styles.selectionInfo}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons 
                    name="book-check" 
                    size={24} 
                    color="#D4AF37"
                  />
                  <Text style={styles.statNumber}>{selectedCourses.length}</Text>
                  <Text style={styles.statLabel}>Seçilen</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons 
                    name="clock-outline" 
                    size={24} 
                    color="#D4AF37"
                  />
                  <Text style={styles.statNumber}>{pendingCourses.length}</Text>
                  <Text style={styles.statLabel}>Bekleyen</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Searchbar
            placeholder="Ders ara..."
            onChangeText={onChangeSearch}
            value={searchQuery}
            style={styles.searchBar}
            icon={() => (
              <MaterialCommunityIcons 
                name="magnify" 
                size={24} 
                color="#D4AF37"
              />
            )}
          />

          {pendingCourses.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Onay Bekleyen Dersler</Text>
              {pendingCourses.map((course) => (
                <Card 
                  key={course.id}
                  style={styles.courseCard}
                >
                  <Card.Content>
                    <View style={styles.courseHeader}>
                      <View style={styles.courseInfo}>
                        <Text style={styles.courseName}>{course.name}</Text>
                        <Text style={styles.courseCode}>{course.code}</Text>
                      </View>
                      <Chip 
                        mode="outlined" 
                        style={styles.statusChip}
                        textStyle={{ color: '#D4AF37' }}
                      >
                        Onay Bekliyor
                      </Chip>
                    </View>
                  </Card.Content>
                </Card>
              ))}
              <Divider style={styles.divider} />
            </>
          )}

          <Text style={styles.sectionTitle}>Seçilebilir Dersler</Text>

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
                <View style={styles.courseHeader}>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.name}</Text>
                    <Text style={styles.courseCode}>{course.code}</Text>
                  </View>
                  <Chip 
                    mode={selectedCourses.includes(course.id) ? "flat" : "outlined"}
                    style={[
                      styles.selectChip,
                      selectedCourses.includes(course.id) && styles.selectedChip
                    ]}
                    textStyle={{ 
                      color: selectedCourses.includes(course.id) 
                        ? '#FFFFFF'
                        : '#D4AF37'
                    }}
                  >
                    {selectedCourses.includes(course.id) ? 'Seçildi' : 'Seç'}
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          ))}
          <View style={styles.bottomSpacing} />
        </View>
      </ScrollView>

      <Surface style={styles.bottomBar}>
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
      </Surface>
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
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
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
  searchBar: {
    marginBottom: 20,
    borderRadius: 15,
    elevation: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#11263E',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 15,
  },
  courseCard: {
    backgroundColor: '#11263E',
    marginBottom: 15,
    borderRadius: 15,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statusChip: {
    borderRadius: 20,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent',
  },
  selectChip: {
    borderRadius: 20,
    borderColor: '#D4AF37',
    backgroundColor: 'transparent',
  },
  selectedChip: {
    backgroundColor: '#D4AF37',
  },
  divider: {
    backgroundColor: '#D4AF37',
    marginVertical: 20,
    height: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    elevation: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomContent: {
    padding: 16,
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: 80,
  },
}); 