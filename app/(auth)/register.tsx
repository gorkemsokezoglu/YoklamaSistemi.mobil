import { Picker } from '@react-native-picker/picker';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Checkbox, IconButton, Modal, Portal, ProgressBar, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KVKK_TEXT } from '../../constants/kvkk';
import { authService } from '../../services/auth';
import { departmentService } from '../../services/department';
import { facultyService } from '../../services/faculty';
import { AcademicianCreate, StudentCreate } from '../../types/auth';
import { Department } from '../../types/department';
import { Faculty } from '../../types/faculty';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function RegisterScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const [role, setRole] = useState<'student' | 'academician'>('student');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [faculty, setFaculty] = useState('');
    const [department, setDepartment] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [academicianNumber, setAcademicianNumber] = useState('');
    const [faceImages, setFaceImages] = useState<string[]>([]);
    const [kvkkAccepted, setKvkkAccepted] = useState(false);
    const [class_, setClass_] = useState('');
    
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const REQUIRED_FACE_IMAGES = 5;
    const [showGuide, setShowGuide] = useState(false);
    const [showFaceImages, setShowFaceImages] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [studentNumberError, setStudentNumberError] = useState('');
    const [academicianNumberError, setAcademicianNumberError] = useState('');
    const [showKvkkModal, setShowKvkkModal] = useState(false);

    // Kamera için yeni state'ler
    const [showCamera, setShowCamera] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('front');
    const [isCapturing, setIsCapturing] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Fotoğraf rehberi mesajları
    const PHOTO_INSTRUCTIONS = [
        "Düz bakış - Kameraya doğrudan bakın",
        "Sağ çapraz - Başınızı hafif sağa çevirin", 
        "Sol çapraz - Başınızı hafif sola çevirin",
        "Sağ profil - Başınızı sağa 45° çevirin",
        "Sol profil - Başınızı sola 45° çevirin"
    ];

    useEffect(() => {
        loadFaculties();
    }, []);

    useEffect(() => {
        if (faculty) {
            loadDepartments();
        } else {
            setDepartments([]);
        }
    }, [faculty]);

    useEffect(() => {
        if (params.faceImages) {
            try {
                const images = JSON.parse(params.faceImages as string);
                if (Array.isArray(images)) {
                    setFaceImages(images);
                }
            } catch (error) {
                console.error('Fotoğraf verisi parse edilemedi:', error);
            }
        }
    }, [params.faceImages]);

    const loadFaculties = async () => {
        try {
            setLoading(true);
            const response = await facultyService.getFaculties();
            
            if (response?.data) {
                setFaculties(response.data);
            } else {
                Alert.alert('Hata', 'Fakülte listesi alınamadı.');
            }
        } catch (error) {
            console.error('Fakülteler yüklenirken hata:', error);
            Alert.alert('Hata', 'Fakülte listesi yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const loadDepartments = async () => {
        if (!faculty) return;

        try {
            setLoading(true);
            const response = await departmentService.getDepartmentsByFaculty(Number(faculty));
            
            if (response?.data) {
                setDepartments(response.data);
            } else {
                Alert.alert('Hata', 'Bölüm listesi alınamadı.');
            }
        } catch (error) {
            console.error('Bölümler yüklenirken hata:', error);
            Alert.alert('Hata', 'Bölüm listesi yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Yeni kamera açma fonksiyonu
    const openCamera = async () => {
        if (!permission) {
            const newPermission = await requestPermission();
            if (!newPermission.granted) {
                Alert.alert('Hata', 'Kamera izni olmadan fotoğraf çekemezsiniz!');
                return;
            }
        } else if (!permission.granted) {
            const newPermission = await requestPermission();
            if (!newPermission.granted) {
                Alert.alert('Hata', 'Kamera izni olmadan fotoğraf çekemezsiniz!');
                return;
            }
        }

        setShowCamera(true);
    };

    // Fotoğraf çekme fonksiyonu
    const takePicture = async () => {
        if (!cameraRef.current || isCapturing) return;

        try {
            setIsCapturing(true);
            
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                base64: true,
                skipProcessing: false,
            });

            if (photo && photo.base64) {
                setFaceImages(prev => [...prev, photo.base64!]);
                
                // 5 fotoğraf tamamlandığında kamerayı kapat
                if (faceImages.length + 1 >= REQUIRED_FACE_IMAGES) {
                    setShowCamera(false);
                    Alert.alert('Tebrikler!', 'Tüm fotoğraflar başarıyla çekildi.');
                }
            }
        } catch (error) {
            console.error('Fotoğraf çekerken hata:', error);
            Alert.alert('Hata', 'Fotoğraf çekilemedi. Lütfen tekrar deneyin.');
        } finally {
            setIsCapturing(false);
        }
    };

    const removeFaceImage = (index: number) => {
        setFaceImages(prev => prev.filter((_, i) => i !== index));
    };

    // Kamera görünümünü kapat
    const closeCamera = () => {
        setShowCamera(false);
    };

    // Kamera yönünü değiştir
    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    // Email validasyon fonksiyonu
    const validateEmail = (email: string) => {
        if (role === 'student') {
            const studentEmailRegex = /@ogr\.iuc\.edu\.tr$/;
            if (!studentEmailRegex.test(email)) {
                setEmailError('Lütfen geçerli bir öğrenci mail adresi giriniz (@ogr.iuc.edu.tr)');
                return false;
            }
        } else if (role === 'academician') {
            const academicianEmailRegex = /@iuc\.edu\.tr$/;
            if (!academicianEmailRegex.test(email)) {
                setEmailError('Lütfen geçerli bir akademisyen mail adresi giriniz (@iuc.edu.tr)');
                return false;
            }
        }
        setEmailError('');
        return true;
    };

    // Email değiştiğinde validasyon yap
    const handleEmailChange = (text: string) => {
        setEmail(text);
        validateEmail(text);
    };

    // Öğrenci numarası validasyonu
    const validateStudentNumber = (number: string) => {
        const studentNumberRegex = /^S\d{10}$/;
        if (!studentNumberRegex.test(number)) {
            setStudentNumberError('Öğrenci numarası S ile başlamalı ve 10 rakam içermelidir (Örn: S2023000001)');
            return false;
        }
        setStudentNumberError('');
        return true;
    };

    // Akademisyen numarası validasyonu
    const validateAcademicianNumber = (number: string) => {
        const academicianNumberRegex = /^A\d{8}$/;
        if (!academicianNumberRegex.test(number)) {
            setAcademicianNumberError('Akademisyen numarası A ile başlamalı ve 8 rakam içermelidir (Örn: A23000001)');
            return false;
        }
        setAcademicianNumberError('');
        return true;
    };

    // Öğrenci numarası değiştiğinde
    const handleStudentNumberChange = (text: string) => {
        setStudentNumber(text.toUpperCase());
        validateStudentNumber(text.toUpperCase());
    };

    // Akademisyen numarası değiştiğinde
    const handleAcademicianNumberChange = (text: string) => {
        setAcademicianNumber(text.toUpperCase());
        validateAcademicianNumber(text.toUpperCase());
    };

    const handleRegister = async () => {
        try {
            if (!email || !password || !firstName || !lastName || !faculty || !department || 
                (role === 'student' && (!studentNumber || !class_ || faceImages.length < REQUIRED_FACE_IMAGES))) {
                Alert.alert('Hata', 'Tüm alanların doldurulması zorunludur.');
                return;
            }

            if (!kvkkAccepted) {
                Alert.alert('Hata', 'Lütfen KVKK metnini okuyup onaylayın.');
                return;
            }

            setLoading(true);

            // Seçilen fakülte ve bölümün isimlerini bul
            const selectedFaculty = faculties.find(f => f.id.toString() === faculty)?.name || '';
            const selectedDepartment = departments.find(d => d.id.toString() === department)?.name || '';

            let registerData: StudentCreate | AcademicianCreate;

            if (role === 'student') {
                registerData = {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: email.trim(),
                    password: password,
                    role: 'student',
                    faculty: selectedFaculty,
                    department: selectedDepartment,
                    student_number: studentNumber.trim(),
                    class_: class_ === '0' ? 'hazirlik' : class_,
                    face_data: faceImages.map(base64Image => ({
                        face_image_base64: base64Image
                    }))
                };
            } else {
                registerData = {
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email: email.trim(),
                    password: password,
                    role: 'academician',
                    faculty: selectedFaculty,
                    department: selectedDepartment,
                    academician_number: academicianNumber.trim()
                };
            }

            console.log('API\'ye gönderilen kayıt verisi:', {
                ...registerData,
                face_data: registerData.role === 'student' && registerData.face_data
                    ? `${registerData.face_data.length} adet yüz fotoğrafı` 
                    : undefined
            });

            try {
                const response = await authService.register(registerData);

                Alert.alert(
                    'Hesabınızı Doğrulayın',
                    'E-posta adresinize gönderilen doğrulama kodunu girerek kaydınızı tamamlayın.',
                    [
                        {
                            text: 'Tamam',
                            onPress: () => router.replace({
                                pathname: '/(auth)/email-verification',
                                params: { email: email.trim() }
                            })
                        }
                    ]
                );
            } catch (error: any) {
                console.error('Kayıt hatası detayı:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });

                let errorMessage = 'Kayıt olurken bir hata oluştu.';
                
                // 422 hatası için detaylı mesaj
                if (error.response?.status === 422) {
                    const validationErrors = error.response?.data?.detail;
                    if (Array.isArray(validationErrors)) {
                        errorMessage = validationErrors.map(err => err.msg).join('\n');
                    } else if (typeof validationErrors === 'string') {
                        errorMessage = validationErrors;
                    }
                    console.log('Validasyon hataları:', validationErrors);
                } else if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                }

                Alert.alert('Hata', errorMessage);
            } finally {
                setLoading(false);
            }
        } catch (error: any) {
            console.error('Form hazırlama hatası:', error);
            Alert.alert('Hata', 'Form hazırlanırken bir hata oluştu.');
            setLoading(false);
        }
    };

    const handleKvkkPress = () => {
        setShowKvkkModal(true);
    };

    // Kamera Modal Bileşeni
    const renderCameraModal = () => (
        <Portal>
            <Modal 
                visible={showCamera} 
                onDismiss={closeCamera}
                contentContainerStyle={styles.cameraModalContainer}
                style={{ margin: 0 }}
            >
                <View style={styles.cameraContainer}>
                    {/* Kamera Görünümü */}
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        mode="picture"
                    >
                        {/* Üst Bar */}
                        <View style={styles.cameraTopBar}>
                            <IconButton
                                icon="close"
                                iconColor="#FFFFFF"
                                size={28}
                                onPress={closeCamera}
                            />
                            <Text style={styles.cameraTitle}>
                                Fotoğraf {faceImages.length + 1}/{REQUIRED_FACE_IMAGES}
                            </Text>
                            <IconButton
                                icon="camera-flip"
                                iconColor="#FFFFFF"
                                size={28}
                                onPress={toggleCameraFacing}
                            />
                        </View>

                        {/* Merkez Rehber */}
                        <View style={styles.centerGuide}>
                            <View style={styles.faceFrame} />
                            <Text style={styles.instructionText}>
                                {PHOTO_INSTRUCTIONS[faceImages.length]}
                            </Text>
                        </View>

                        {/* Alt Bar */}
                        <View style={styles.cameraBottomBar}>
                            {/* Çekim Butonu */}
                            <TouchableOpacity
                                style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                                onPress={takePicture}
                                disabled={isCapturing}
                            >
                                <View style={styles.captureButtonInner} />
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            </Modal>
        </Portal>
    );

    const renderGuide = () => (
        <Portal>
            <Modal visible={showGuide} onDismiss={() => setShowGuide(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: '#FFFFFF' }]}>
                <Card style={{ backgroundColor: '#FFFFFF' }}>
                    <Card.Content>
                        <Text variant="titleLarge" style={styles.guideTitle}>Yüz Fotoğrafı Çekme Rehberi</Text>
                        <Text variant="bodyMedium" style={styles.guideText}>
                            Lütfen aşağıdaki yönergelere göre 5 farklı açıdan fotoğraf çekiniz:{'\n\n'}
                            1. Düz Bakış: Direkt kameraya bakın ve yüzünüzü sabit tutun{'\n'}
                            2. Sağ Çapraz: Başınızı hafif sağa döndürün{'\n'}
                            3. Sol Çapraz: Başınızı hafif sola döndürün{'\n'}
                            4. Sağ Profil: Başınızı sağa doğru 45 derece çevirin{'\n'}
                            5. Sol Profil: Başınızı sola doğru 45 derece çevirin{'\n\n'}
                            Önemli Noktalar:{'\n'}
                            • İyi aydınlatılmış bir ortamda olduğunuzdan emin olun{'\n'}
                            • Gözlük, maske gibi yüzünüzü kapatan aksesuarları çıkarın{'\n'}
                            • Fotoğraf çekerken sabit durun
                        </Text>
                    </Card.Content>
                    <Card.Actions>
                        <Button 
                            mode="contained"
                            onPress={() => setShowGuide(false)}
                            style={{ backgroundColor: '#D4AF37' }}
                            labelStyle={{ color: '#003366' }}
                        >
                            Anladım
                        </Button>
                    </Card.Actions>
                </Card>
            </Modal>
        </Portal>
    );

    const renderKvkkContent = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, index) => {
            // Markdown başlık kontrolü
            const titleMatch = line.match(/^\*\*(.*?)\*\*$/);
            if (titleMatch) {
                const titleText = titleMatch[1];
                // Ana başlık kontrolü
                if (titleText.includes('Aydınlatma Metni')) {
                    return (
                        <Text key={index} style={[styles.kvkkModalTitle, { fontSize: 20, marginBottom: 20 }]}>
                            {titleText}
                        </Text>
                    );
                }
                // Alt başlıklar
                return (
                    <Text key={index} style={styles.kvkkModalTitle}>
                        {titleText}
                    </Text>
                );
            }

            // Boş satır kontrolü
            if (line.trim() === '') {
                return <Text key={index}>{'\n'}</Text>;
            }

            // Madde işaretli satırlar için özel stil
            if (line.trim().startsWith('•')) {
                return (
                    <Text key={index} style={[styles.kvkkModalContent, { paddingLeft: 20 }]}>
                        {line}
                    </Text>
                );
            }

            // Normal metin
            return (
                <Text key={index} style={styles.kvkkModalContent}>
                    {line}
                </Text>
            );
        });
    };

    const renderKvkkModal = () => (
        <Portal>
            <Modal 
                visible={showKvkkModal} 
                onDismiss={() => setShowKvkkModal(false)} 
                contentContainerStyle={[styles.kvkkModalContainer, { backgroundColor: '#FFFFFF' }]}
            >
                <ScrollView style={{ backgroundColor: '#FFFFFF' }}>
                    <Card style={{ backgroundColor: '#FFFFFF' }}>
                        <Card.Content>
                            {renderKvkkContent(KVKK_TEXT)}
                        </Card.Content>
                        <Card.Actions>
                            <Button 
                                mode="contained"
                                onPress={() => setShowKvkkModal(false)}
                                style={{ backgroundColor: '#D4AF37' }}
                                labelStyle={{ color: '#003366' }}
                            >
                                Kapat
                            </Button>
                        </Card.Actions>
                    </Card>
                </ScrollView>
            </Modal>
        </Portal>
    );

    const renderFaceImagesModal = () => (
        <Portal>
            <Modal 
                visible={showFaceImages} 
                onDismiss={() => setShowFaceImages(false)} 
                contentContainerStyle={[styles.faceImagesModalContainer]}
            >
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Çekilen Fotoğraflar</Text>
                    <Button 
                        icon="close" 
                        mode="text" 
                        onPress={() => setShowFaceImages(false)}
                        labelStyle={{ color: '#FFFFFF' }}
                    >
                        Kapat
                    </Button>
                </View>
                <ScrollView style={styles.modalScrollView}>
                    <View style={styles.imageGrid}>
                        {faceImages.map((image, index) => (
                            <View key={index} style={styles.modalImageContainer}>
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${image}` }}
                                    style={styles.modalImage}
                                />
                                <TouchableOpacity 
                                    style={styles.deleteIconContainer}
                                    onPress={() => removeFaceImage(index)}
                                >
                                    <Text style={styles.deleteIcon}>✕</Text>
                                </TouchableOpacity>
                                <View style={styles.imageOverlay}>
                                    <Text style={styles.imageNumber}>{index + 1}/{REQUIRED_FACE_IMAGES}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </Modal>
        </Portal>
    );

    const renderFaceImageProgress = () => {
        const progress = faceImages.length / REQUIRED_FACE_IMAGES;
        return (
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                    Yüz Fotoğrafları: {faceImages.length}/{REQUIRED_FACE_IMAGES}
                </Text>
                <ProgressBar progress={progress} style={styles.progressBar} />
                
                <Button
                    mode="text"
                    onPress={() => setShowGuide(true)}
                    icon="help-circle"
                    style={styles.helpButton}
                >
                    Fotoğraf Çekme Rehberi
                </Button>

                <View style={styles.imageGrid}>
                    {faceImages.map((image, index) => (
                        <View key={index} style={styles.imageContainer}>
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${image}` }}
                                style={styles.image}
                            />
                            <Button
                                icon="delete"
                                mode="contained-tonal"
                                onPress={() => removeFaceImage(index)}
                                style={styles.deleteButton}
                            >
                                Sil
                            </Button>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />
            <SafeAreaView style={styles.safeArea}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.logoContainer}>
                        <Image 
                            source={require('../../assets/images/iucLogo3.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.segmentedButtonContainer}>
                            <Button
                                mode={role === 'student' ? 'contained' : 'outlined'}
                                onPress={() => setRole('student')}
                                style={[styles.segmentedButton, role === 'student' && styles.segmentedButtonActive]}
                                labelStyle={[styles.segmentedButtonText, role === 'student' && styles.segmentedButtonTextActive]}
                            >
                                Öğrenci
                            </Button>
                            <Button
                                mode={role === 'academician' ? 'contained' : 'outlined'}
                                onPress={() => setRole('academician')}
                                style={[styles.segmentedButton, role === 'academician' && styles.segmentedButtonActive]}
                                labelStyle={[styles.segmentedButtonText, role === 'academician' && styles.segmentedButtonTextActive]}
                            >
                                Akademisyen
                            </Button>
                        </View>

                        <View style={styles.inputContainer}>
                            <Image 
                                source={require('../../assets/images/user-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Ad"
                                placeholderTextColor="#B4B4B4"
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Image 
                                source={require('../../assets/images/user-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Soyad"
                                placeholderTextColor="#B4B4B4"
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Image 
                                source={require('../../assets/images/mail-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={`E-posta (${role === 'student' ? '@ogr.iuc.edu.tr' : '@iuc.edu.tr'})`}
                                placeholderTextColor="#B4B4B4"
                                value={email}
                                onChangeText={handleEmailChange}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        {emailError ? (
                            <Text style={styles.errorText}>{emailError}</Text>
                        ) : null}

                        <View style={styles.inputContainer}>
                            <Image 
                                source={require('../../assets/images/lock-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifre"
                                placeholderTextColor="#B4B4B4"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={[styles.inputContainer, styles.pickerWrapper]}>
                            <Image 
                                source={require('../../assets/images/faculty-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={faculty}
                                    onValueChange={(value) => {
                                        setFaculty(value);
                                        setDepartment(''); // Fakülte değişince bölümü sıfırla
                                    }}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Fakülte Seçin" value="" color="#B4B4B4" />
                                    {faculties?.map(faculty => (
                                        <Picker.Item 
                                            key={faculty.id} 
                                            label={faculty.name} 
                                            value={faculty.id.toString()} 
                                            color="#11263E"
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        <View style={[styles.inputContainer, styles.pickerWrapper]}>
                            <Image 
                                source={require('../../assets/images/department-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={department}
                                    onValueChange={setDepartment}
                                    style={styles.picker}
                                    enabled={!!faculty}
                                >
                                    <Picker.Item label="Bölüm Seçin" value="" color="#B4B4B4" />
                                    {departments?.map(department => (
                                        <Picker.Item 
                                            key={department.id} 
                                            label={department.name} 
                                            value={department.id.toString()}
                                            color="#11263E"
                                        />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        {role === 'student' && (
                            <View style={[styles.inputContainer, styles.pickerWrapper]}>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={class_}
                                        onValueChange={setClass_}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Sınıf Seçin" value="" color="#B4B4B4" />
                                        <Picker.Item label="Hazırlık" value="0" color="#11263E" />
                                        <Picker.Item label="1. Sınıf" value="1" color="#11263E" />
                                        <Picker.Item label="2. Sınıf" value="2" color="#11263E" />
                                        <Picker.Item label="3. Sınıf" value="3" color="#11263E" />
                                        <Picker.Item label="4. Sınıf" value="4" color="#11263E" />
                                    </Picker>
                                </View>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Image 
                                source={require('../../assets/images/id-icon.png')} 
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder={role === 'student' ? 'Öğrenci No (S2023000001)' : 'Akademisyen No (A23000001)'}
                                placeholderTextColor="#B4B4B4"
                                value={role === 'student' ? studentNumber : academicianNumber}
                                onChangeText={role === 'student' ? handleStudentNumberChange : handleAcademicianNumberChange}
                                autoCapitalize="characters"
                            />
                        </View>
                        {studentNumberError || academicianNumberError ? (
                            <Text style={styles.errorText}>
                                {role === 'student' ? studentNumberError : academicianNumberError}
                            </Text>
                        ) : null}

                        {role === 'student' && (
                            <View style={styles.faceImageSection}>
                                <View style={styles.progressContainer}>
                                    <Text style={styles.progressText}>
                                        Yüz Fotoğrafları: {faceImages.length}/{REQUIRED_FACE_IMAGES}
                                    </Text>
                                    <ProgressBar 
                                        progress={faceImages.length / REQUIRED_FACE_IMAGES} 
                                        color="#D4AF37"
                                        style={styles.progressBar} 
                                    />
                                </View>

                                <Button
                                    mode="contained"
                                    onPress={openCamera}
                                    icon="camera"
                                    style={[styles.button, { backgroundColor: '#D4AF37' }]}
                                    labelStyle={[styles.buttonText, { color: '#003366' }]}
                                    disabled={faceImages.length >= REQUIRED_FACE_IMAGES}
                                >
                                    {faceImages.length >= REQUIRED_FACE_IMAGES 
                                        ? 'Tüm Fotoğraflar Çekildi' 
                                        : 'Yüz Fotoğrafı Çek'}
                                </Button>

                                {faceImages.length > 0 && (
                                    <Button
                                        mode="contained"
                                        onPress={() => setShowFaceImages(true)}
                                        icon="eye"
                                        style={[styles.button, { backgroundColor: '#D4AF37', marginTop: 10 }]}
                                        labelStyle={[styles.buttonText, { color: '#003366' }]}
                                    >
                                        Fotoğrafları Görüntüle ({faceImages.length})
                                    </Button>
                                )}

                                <Button
                                    mode="text"
                                    onPress={() => setShowGuide(true)}
                                    icon="help-circle"
                                    style={styles.helpButton}
                                    labelStyle={{ color: '#D4AF37' }}
                                >
                                    Fotoğraf Çekme Rehberi
                                </Button>
                            </View>
                        )}

                        <View style={styles.kvkkContainer}>
                            <View style={styles.checkboxRow}>
                                <Checkbox
                                    status={kvkkAccepted ? 'checked' : 'unchecked'}
                                    onPress={() => setKvkkAccepted(!kvkkAccepted)}
                                    color="#D4AF37"
                                />
                                <Text style={styles.kvkkText}>
                                    <Text style={{ color: '#FFFFFF' }}>
                                        Kişisel verilerimin işlenmesine ilişkin{' '}
                                    </Text>
                                    <Text style={styles.kvkkLink} onPress={handleKvkkPress}>
                                        Aydınlatma Metni
                                    </Text>
                                    <Text style={{ color: '#FFFFFF' }}>
                                        'ni okudum ve kabul ediyorum.
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <Button
                                mode="contained"
                                onPress={handleRegister}
                                loading={loading}
                                disabled={
                                    loading || 
                                    !email || 
                                    !password || 
                                    !firstName || 
                                    !lastName || 
                                    !faculty || 
                                    !department || 
                                    !kvkkAccepted ||
                                    (role === 'student' && (
                                        !studentNumber || 
                                        !class_ || 
                                        faceImages.length < REQUIRED_FACE_IMAGES ||
                                        !!emailError ||
                                        !!studentNumberError
                                    )) ||
                                    (role === 'academician' && (
                                        !academicianNumber ||
                                        !!emailError ||
                                        !!academicianNumberError
                                    ))
                                }
                                style={[
                                    styles.button, 
                                    { 
                                        backgroundColor: '#D4AF37',
                                        opacity: loading || !email || !password || !firstName || !lastName || !faculty || !department || !kvkkAccepted ||
                                        (role === 'student' && (!studentNumber || !class_ || faceImages.length < REQUIRED_FACE_IMAGES || !!emailError || !!studentNumberError)) ||
                                        (role === 'academician' && (!academicianNumber || !!emailError || !!academicianNumberError)) ? 0.5 : 1
                                    }
                                ]}
                                labelStyle={[styles.buttonText, { color: '#003366' }]}
                            >
                                KAYIT OL
                            </Button>

                            <Link href="/(auth)/login" asChild>
                                <Text style={styles.loginText}>
                                    Zaten hesabınız var mı? Giriş yapın
                                </Text>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
            {renderKvkkModal()}
            {renderGuide()}
            {renderFaceImagesModal()}
            {renderCameraModal()}
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#11263E',
    },
    scrollContainer: {
        flexGrow: 1,
        backgroundColor: '#11263E',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 150,
        marginBottom: 20,
    },
    logo: {
        width: '80%',
        height: '100%',
        resizeMode: 'contain',
    },
    formContainer: {
        width: '100%',
        gap: 15,
    },
    segmentedButtonContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    segmentedButton: {
        flex: 1,
        borderColor: '#D4AF37',
        borderRadius: 25,
    },
    segmentedButtonActive: {
        backgroundColor: '#D4AF37',
    },
    segmentedButtonText: {
        color: '#D4AF37',
        fontSize: 16,
    },
    segmentedButtonTextActive: {
        color: '#003366',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A3A5A',
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 50,
    },
    inputIcon: {
        width: 20,
        height: 20,
        marginRight: 10,
        tintColor: '#D4AF37',
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        height: 50,
    },
    pickerWrapper: {
        paddingHorizontal: 10,
        paddingRight: 0,
        height: 50,
    },
    pickerContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    picker: {
        color: '#FFFFFF',
        backgroundColor: 'transparent',
    },
    kvkkContainer: {
        marginVertical: 15,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: 10,
    },
    kvkkText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        lineHeight: 20,
    },
    kvkkLink: {
        color: '#D4AF37',
        textDecorationLine: 'underline',
    },
    buttonContainer: {
        width: '100%',
        marginTop: 10,
        marginBottom: 20,
    },
    button: {
        borderRadius: 25,
        height: 50,
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#003366',
        letterSpacing: 1,
    },
    loginText: {
        color: '#D4AF37',
        textAlign: 'center',
        marginTop: 15,
        fontSize: 16,
        textDecorationLine: 'underline',
    },
    errorText: {
        color: '#B00020',
        fontSize: 12,
        marginTop: 5,
        marginBottom: 10,
        marginLeft: 4,
    },
    faceImageSection: {
        marginTop: 15,
    },
    progressContainer: {
        marginBottom: 15,
    },
    progressText: {
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#1A3A5A',
    },
    cameraButton: {
        marginBottom: 10,
    },
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        marginTop: 15,
    },
    imageContainer: {
        width: 150,
        alignItems: 'center',
    },
    image: {
        width: 150,
        height: 150,
        borderRadius: 8,
        marginBottom: 8,
    },
    deleteButton: {
        width: '100%',
        backgroundColor: '#B00020',
    },
    helpButton: {
        marginBottom: 10,
    },
    modalContainer: {
        margin: 20,
        borderRadius: 8,
        padding: 16,
        backgroundColor: '#FFFFFF',
    },
    guideTitle: {
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: 'bold',
        color: '#000000',
    },
    guideText: {
        lineHeight: 24,
        marginBottom: 16,
        color: '#333333',
    },
    kvkkModalContainer: {
        margin: 20,
        borderRadius: 8,
        padding: 16,
        maxHeight: '80%',
        backgroundColor: '#FFFFFF',
    },
    kvkkModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 12,
        color: '#000',
        lineHeight: 24,
    },
    kvkkModalContent: {
        fontSize: 14,
        marginVertical: 5,
        color: '#333',
        lineHeight: 20,
    },
    viewImagesButton: {
        backgroundColor: '#D4AF37',
        flex: 1,
        marginLeft: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    faceImagesModalContainer: {
        backgroundColor: '#11263E',
        margin: 20,
        borderRadius: 15,
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1A3A5A',
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalScrollView: {
        padding: 15,
    },
    modalImageContainer: {
        marginBottom: 15,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#1A3A5A',
        width: '48%',
        aspectRatio: 1,
    },
    modalImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    imageNumber: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    deleteIconContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 15,
        padding: 6,
        zIndex: 2,
    },
    deleteIcon: {
        color: '#FF5252',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cameraModalContainer: {
        flex: 1,
        backgroundColor: '#000000',
        margin: 0,
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    cameraViewContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    camera: {
        flex: 1,
    },
    cameraTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    cameraTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    centerGuide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    faceFrame: {
        width: 250,
        height: 320,
        borderWidth: 3,
        borderColor: '#D4AF37',
        borderRadius: 20,
        borderStyle: 'dashed',
    },
    instructionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
    },
    cameraBottomBar: {
        flexDirection: 'column',
        paddingHorizontal: 20,
        paddingBottom: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    photoPreviewContainer: {
        marginBottom: 20,
        maxHeight: 80,
    },
    photoPreviewItem: {
        marginRight: 15,
        alignItems: 'center',
    },
    photoPreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#D4AF37',
    },
    photoIndex: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
        textAlign: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        borderWidth: 4,
        borderColor: '#D4AF37',
    },
    captureButtonDisabled: {
        backgroundColor: '#AAAAAA',
        borderColor: '#666666',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#D4AF37',
    },
});
