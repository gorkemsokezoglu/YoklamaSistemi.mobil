import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { courseService } from '../services/course';
import { faceRecognitionService } from '../services/face-recognition';
import { Course } from '../types/course';

export default function TakeAttendanceScreen() {
    const router = useRouter();
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCameraGuide, setShowCameraGuide] = useState(false);

    useEffect(() => {
        if (courseId) {
            loadCourseData();
        }
    }, [courseId]);

    const loadCourseData = async () => {
        try {
            const courseData = await courseService.getCourseById(courseId);
            setCourse(courseData);
        } catch (err) {
            console.error('Ders bilgileri yüklenirken hata:', err);
            setError('Ders bilgileri yüklenirken bir hata oluştu');
        }
    };

    const takePicture = async () => {
        try {
            // Kamera izni kontrolü
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Hata', 'Kamera izni olmadan fotoğraf çekemezsiniz!');
                return;
            }

            setShowCameraGuide(true); // Fotoğraf çekme rehberini göster

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
                base64: true,
                exif: false,
                presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
                cameraType: ImagePicker.CameraType.back
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64Image = result.assets[0].base64;
                if (base64Image) {
                    setPhotos(prev => [...prev, base64Image]);
                }
            }
        } catch (error) {
            console.error('Fotoğraf çekerken hata:', error);
            Alert.alert('Hata', 'Fotoğraf çekilemedi. Lütfen tekrar deneyin.');
        } finally {
            setShowCameraGuide(false);
        }
    };

    const pickImage = async () => {
        try {
            // Galeri izni kontrolü
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Hata', 'Galeri izni olmadan fotoğraf seçemezsiniz!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64Image = result.assets[0].base64;
                if (base64Image) {
                    setPhotos(prev => [...prev, base64Image]);
                }
            }
        } catch (error) {
            console.error('Galeri seçiminde hata:', error);
            Alert.alert('Hata', 'Fotoğraf seçilemedi. Lütfen tekrar deneyin.');
        }
    };

    const handleDeletePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleComplete = async () => {
        if (!courseId || !course || photos.length === 0) {
            Alert.alert('Uyarı', 'Lütfen en az bir fotoğraf çekin veya seçin.');
            return;
        }

        setLoading(true);
        try {
            // Fotoğrafları işle
            const results = await Promise.all(
                photos.map(photo => 
                    faceRecognitionService.takeAttendanceWithRoboflow(courseId, `data:image/jpeg;base64,${photo}`)
                )
            );

            // Tüm sonuçları birleştir
            const allStudents = new Set<string>();
            const successfulRecords: any[] = [];
            const failedRecords: any[] = [];

            results.forEach(result => {
                if (result.attendance_records) {
                    result.attendance_records.forEach(record => {
                        if (record.status === 'created') {
                            successfulRecords.push(record);
                            allStudents.add(record.student_number);
                        } else {
                            failedRecords.push(record);
                        }
                    });
                }
            });

            if (allStudents.size === 0) {
                Alert.alert(
                    'Sonuç',
                    'Fotoğraflarda hiç öğrenci tespit edilemedi.\nLütfen fotoğrafları daha net ve yüzler görünür şekilde çekip tekrar deneyin.',
                    [
                        { 
                            text: 'Tekrar Dene',
                            style: 'default'
                        },
                        {
                            text: 'Ders Detayına Dön',
                            onPress: () => router.back(),
                            style: 'cancel'
                        }
                    ]
                );
            } else {
                Alert.alert(
                    'Yoklama Tamamlandı',
                    `${allStudents.size} öğrenci tespit edildi ve yoklamaları alındı.\n\n` +
                    `✓ Başarılı: ${successfulRecords.length} kayıt\n` +
                    `ℹ️ Zaten Kayıtlı: ${failedRecords.length} kayıt`,
                    [
                        { 
                            text: 'Ders Detayına Dön',
                            onPress: () => router.back()
                        }
                    ]
                );
            }
        } catch (err: any) {
            console.error('Yoklama işlenirken hata:', err);
            
            // 400 hata kodu kontrolü
            if (err.response?.status === 400) {
                Alert.alert(
                    'Ders Aktif Değil',
                    'Bu ders şu anda aktif değil. Yoklama sadece ders saatinde alınabilir.',
                    [
                        { 
                            text: 'Ders Detayına Dön',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                Alert.alert(
                    'Hata',
                    'Yoklama işlenirken bir hata oluştu. Lütfen tekrar deneyin.',
                    [{ text: 'Tamam' }]
                );
            }
            setError('Yoklama işlenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image 
                    source={require('../assets/images/logo_zemin1.png')}
                    style={styles.logo}
                    resizeMode="stretch"
                />
            </View>

            <View style={styles.headerButtons}>
                <IconButton
                    icon="arrow-left"
                    size={24}
                    onPress={() => router.back()}
                    iconColor="white"
                />
                <Text style={styles.title}>
                    {course?.name || 'Yoklama Al'}
                </Text>
                <View style={{ width: 48 }} />
            </View>

            <View style={styles.controls}>
                <TouchableOpacity 
                    style={styles.galleryButton} 
                    onPress={pickImage}
                    disabled={loading}
                >
                    <MaterialIcons name="photo-library" size={30} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.captureButton} 
                    onPress={takePicture}
                    disabled={loading}
                >
                    <MaterialIcons name="camera" size={36} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.gallery}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
            >
                {photos.map((photo, index) => (
                    <View key={index} style={styles.imageContainer}>
                        <Image 
                            source={{ uri: `data:image/jpeg;base64,${photo}` }} 
                            style={styles.thumbnail} 
                        />
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeletePhoto(index)}
                        >
                            <MaterialIcons name="close" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>

            <SafeAreaView style={styles.completeButtonContainer}>
                <TouchableOpacity 
                    style={[styles.completeButton, (loading || photos.length === 0) && styles.disabledButton]} 
                    onPress={handleComplete}
                    disabled={loading || photos.length === 0}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.completeButtonText}>Yoklamayı Tamamla</Text>
                    )}
                </TouchableOpacity>
            </SafeAreaView>

            {error && (
                <Text style={styles.error}>{error}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#11263E',
    },
    header: {
        width: '100%',
        height: 100,
        backgroundColor: '#11263E',
        padding: 0,
        overflow: 'hidden',
        paddingTop: 5,
    },
    logo: {
        width: '100%',
        height: '100%',
        resizeMode: 'stretch',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#1A3A5A',
    },
    title: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginHorizontal: 16,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30,
        marginVertical: 20,
    },
    galleryButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1A3A5A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#D4AF37',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gallery: {
        marginTop: 20,
        paddingHorizontal: 10,
    },
    imageContainer: {
        marginHorizontal: 5,
        position: 'relative',
    },
    thumbnail: {
        width: 120,
        height: 160,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#D4AF37',
    },
    deleteButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#FF3B30',
        borderRadius: 12,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 40, // Sistem tuşları için daha fazla boşluk
        backgroundColor: '#11263E',
    },
    completeButton: {
        backgroundColor: '#D4AF37',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#666',
    },
    completeButtonText: {
        color: '#11263E',
        fontSize: 16,
        fontWeight: 'bold',
    },
    error: {
        color: '#FF3B30',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
}); 