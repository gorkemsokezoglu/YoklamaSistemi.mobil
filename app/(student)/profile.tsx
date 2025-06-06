import { authService } from '@/services/auth';
import { departmentService } from '@/services/department';
import { facultyService } from '@/services/faculty';
import { studentService } from '@/services/student';
import { StudentProfile } from '@/types/auth';
import { Department } from '@/types/department';
import { Faculty } from '@/types/faculty';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';

export default function StudentProfileScreen() {
    const { logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        faculty: '',
        department: '',
        student_number: ''
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_new_password: ''
    });
    const [passwordError, setPasswordError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        if (isEditing && formData.faculty) {
            const selectedFaculty = faculties.find(f => f.name === formData.faculty);
            if (selectedFaculty) {
                loadDepartments(selectedFaculty.id);
            }
        }
    }, [formData.faculty, isEditing]);

    const loadDepartments = async (facultyId: number) => {
        try {
            const response = await departmentService.getDepartmentsByFaculty(facultyId);
            setDepartments(response.data);
            // Eğer seçili bölüm bu fakülteye ait değilse, bölüm seçimini sıfırla
            const currentDepartment = response.data.find(d => d.name === formData.department);
            if (!currentDepartment) {
                setFormData(prev => ({ ...prev, department: '' }));
            }
        } catch (error) {
            console.error('Bölümler yüklenirken hata:', error);
        }
    };

    const loadProfile = async () => {
        try {
            setLoading(true);
            const studentProfile = await studentService.getMe();
            setProfile(studentProfile);

            // Fakülte ve bölüm bilgilerini yükle
            const facultiesResponse = await facultyService.getFaculties();
            setFaculties(facultiesResponse.data);

            let departmentName = '';
            let facultyName = '';

            if (studentProfile.faculty && !isNaN(parseInt(studentProfile.faculty))) {
                const facultyId = parseInt(studentProfile.faculty);
                console.log(`${facultyId} ID'li fakültenin bölümleri yükleniyor...`);
                
                try {
                    const departmentsResponse = await departmentService.getDepartmentsByFaculty(facultyId);
                    setDepartments(departmentsResponse.data);
                    departmentName = departmentsResponse.data.find(d => d.id.toString() === studentProfile.department)?.name || '';
                    facultyName = facultiesResponse.data.find(f => f.id.toString() === studentProfile.faculty)?.name || '';
                } catch (err) {
                    console.error(`Fakülte(${facultyId}) bölümleri yüklenirken hata:`, err);
                    setDepartments([]);
                }
            }

            setFormData({
                first_name: studentProfile.first_name,
                last_name: studentProfile.last_name,
                email: studentProfile.email,
                faculty: facultyName,
                department: departmentName,
                student_number: studentProfile.student_number
            });
            setError(null);
        } catch (err) {
            console.error('Profil yüklenirken hata:', err);
            setError('Profil bilgileri yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);

            // Form validasyonu
            if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
                setError('Ad, soyad ve e-posta alanları boş bırakılamaz');
                return;
            }

            const updateData = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                email: formData.email.trim(),
            };

            console.log('Güncellenecek veriler:', updateData);

            await studentService.updateStudent(profile?.user_id || '', updateData);
            await loadProfile();
            setIsEditing(false);
            setError(null);
        } catch (err: any) {
            console.error('Profil güncellenirken hata:', err);
            const errorMessage = err.response?.data?.detail || 'Profil güncellenirken bir hata oluştu';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            await logout();
            router.replace('/(auth)/login');
        } catch (err) {
            console.error('Çıkış yapılırken hata:', err);
            setError('Çıkış yapılırken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            setPasswordError(null);
            
            // Validasyonlar
            if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_new_password) {
                setPasswordError('Tüm alanları doldurunuz');
                return;
            }

            if (passwordForm.new_password !== passwordForm.confirm_new_password) {
                setPasswordError('Yeni şifreler eşleşmiyor');
                return;
            }

            if (passwordForm.new_password.length < 6) {
                setPasswordError('Yeni şifre en az 6 karakter olmalıdır');
                return;
            }

            await authService.changePassword({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
                confirm_new_password: passwordForm.confirm_new_password
            });

            // Başarılı
            setShowPasswordModal(false);
            setPasswordForm({
                current_password: '',
                new_password: '',
                confirm_new_password: ''
            });
            alert('Şifreniz başarıyla değiştirildi');

        } catch (err: any) {
            console.error('Şifre değiştirme hatası:', err);
            setPasswordError(err.response?.data?.detail || 'Şifre değiştirme işlemi başarısız oldu');
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
                <Button mode="contained" onPress={loadProfile}>Tekrar Dene</Button>
            </View>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image 
                    source={require('../../assets/images/logo_zemin1.png')}
                    style={styles.logo}
                    resizeMode="stretch"
                />
            </View>
            <View style={styles.content}>
                <Card style={styles.profileCard}>
                    <Card.Content style={styles.profileHeader}>
                        <Avatar.Text 
                            size={80} 
                            label={`${profile.first_name[0]}${profile.last_name[0]}`}
                            style={styles.avatar}
                            color="#FFFFFF"
                            theme={{ colors: { primary: '#D4AF37' } }}
                        />
                        <View style={styles.profileInfo}>
                            <Text variant="headlineSmall" style={styles.profileName}>{`${profile.first_name} ${profile.last_name}`}</Text>
                            <Text variant="titleMedium" style={styles.title}>Öğrenci</Text>
                            <Text variant="bodyLarge" style={styles.department}>
                                {departments.find(d => d.id.toString() === profile.department)?.name || profile.department}
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={styles.detailsCard}>
                    <Card.Content>
                        <Text variant="titleMedium" style={styles.sectionTitle}>
                            <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#D4AF37" />
                            {" "}Kişisel Bilgiler
                        </Text>

                        <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="account" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>Ad</Text>
                            </View>
                            {isEditing ? (
                                <TextInput
                                    value={formData.first_name}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
                                    mode="outlined"
                                    style={styles.input}
                                    outlineColor="#D4AF37"
                                    activeOutlineColor="#11263E"
                                />
                            ) : (
                                <Text variant="bodyLarge" style={styles.infoValue}>{profile.first_name}</Text>
                            )}
                        </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(200).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="account" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>Soyad</Text>
                            </View>
                            {isEditing ? (
                                <TextInput
                                    value={formData.last_name}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, last_name: text }))}
                                    mode="outlined"
                                    style={styles.input}
                                    outlineColor="#D4AF37"
                                    activeOutlineColor="#11263E"
                                />
                            ) : (
                                <Text variant="bodyLarge" style={styles.infoValue}>{profile.last_name}</Text>
                            )}
                        </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(300).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="email" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>E-posta</Text>
                            </View>
                            {isEditing ? (
                                <TextInput
                                    value={formData.email}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                                    mode="outlined"
                                    style={styles.input}
                                    keyboardType="email-address"
                                    outlineColor="#D4AF37"
                                    activeOutlineColor="#11263E"
                                />
                            ) : (
                                <Text variant="bodyLarge" style={styles.infoValue}>{profile.email}</Text>
                            )}
                        </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="school" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>Fakülte</Text>
                            </View>
                            <Text variant="bodyLarge" style={styles.infoValue}>
                                {faculties.find(f => f.id.toString() === profile.faculty)?.name || profile.faculty}
                            </Text>
                        </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(500).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="book-education" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>Bölüm</Text>
                            </View>
                            <Text variant="bodyLarge" style={styles.infoValue}>
                                {departments.find(d => d.id.toString() === profile.department)?.name || profile.department}
                            </Text>
                        </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(600).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="card-account-details" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>Öğrenci No</Text>
                            </View>
                            <Text variant="bodyLarge" style={styles.infoValue}>{profile.student_number}</Text>
                        </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(700).springify()}>
                        <View style={styles.inputGroup}>
                            <View style={styles.iconLabelContainer}>
                                <View style={styles.iconBackground}>
                                    <MaterialCommunityIcons name="school-outline" size={20} color="#11263E" />
                                </View>
                                <Text variant="bodyMedium" style={styles.label}>Sınıf</Text>
                            </View>
                            <Text variant="bodyLarge" style={styles.infoValue}>
                                {profile.class_ === 'hazirlik' ? 'Hazırlık' : 
                                 `${profile.class_}. Sınıf`}
                            </Text>
                        </View>
                        </Animated.View>
                    </Card.Content>
                </Card>

                <View style={styles.buttonContainer}>
                    {isEditing ? (
                        <>
                            <Button
                                mode="contained"
                                onPress={handleSave}
                                style={styles.button}
                                loading={loading}
                                buttonColor="#D4AF37"
                            >
                                Kaydet
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={() => setIsEditing(false)}
                                style={styles.button}
                                disabled={loading}
                                textColor="#D4AF37"
                                theme={{ colors: { outline: '#D4AF37' } }}
                            >
                                İptal
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                mode="contained"
                                onPress={() => setIsEditing(true)}
                                style={styles.button}
                                buttonColor="#D4AF37"
                            >
                                Düzenle
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => setShowPasswordModal(true)}
                                style={styles.button}
                                buttonColor="#D4AF37"
                            >
                                Şifre Değiştir
                            </Button>
                            <Button
                                mode="outlined"
                                onPress={handleLogout}
                                style={[styles.button, styles.logoutButton]}
                                icon="logout"
                                textColor="#FF3B30"
                            >
                                Çıkış Yap
                            </Button>
                        </>
                    )}
                </View>

                {/* Şifre Değiştirme Modal */}
                <Portal>
                    <Modal
                        visible={showPasswordModal}
                        onDismiss={() => {
                            setShowPasswordModal(false);
                            setPasswordError(null);
                            setPasswordForm({
                                current_password: '',
                                new_password: '',
                                confirm_new_password: ''
                            });
                        }}
                        contentContainerStyle={styles.modalContainer}
                    >
                        <Card style={styles.modalCard}>
                            <Card.Title 
                                title="Şifre Değiştir" 
                                titleStyle={styles.modalTitle}
                                titleVariant="headlineMedium" 
                            />
                            <Card.Content>
                                {passwordError && (
                                    <Text style={styles.errorText} variant="bodyLarge">{passwordError}</Text>
                                )}
                                <TextInput
                                    label="Mevcut Şifre"
                                    value={passwordForm.current_password}
                                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, current_password: text }))}
                                    secureTextEntry
                                    style={styles.modalInput}
                                    outlineColor="#D4AF37"
                                    activeOutlineColor="#001F3F"
                                    contentStyle={styles.inputText}
                                />
                                <TextInput
                                    label="Yeni Şifre"
                                    value={passwordForm.new_password}
                                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, new_password: text }))}
                                    secureTextEntry
                                    style={styles.modalInput}
                                    outlineColor="#D4AF37"
                                    activeOutlineColor="#001F3F"
                                    contentStyle={styles.inputText}
                                />
                                <TextInput
                                    label="Yeni Şifre (Tekrar)"
                                    value={passwordForm.confirm_new_password}
                                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirm_new_password: text }))}
                                    secureTextEntry
                                    style={styles.modalInput}
                                    outlineColor="#D4AF37"
                                    activeOutlineColor="#001F3F"
                                    contentStyle={styles.inputText}
                                />
                                <View style={styles.modalButtons}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => {
                                            setShowPasswordModal(false);
                                            setPasswordError(null);
                                            setPasswordForm({
                                                current_password: '',
                                                new_password: '',
                                                confirm_new_password: ''
                                            });
                                        }}
                                        style={[styles.modalButton, { borderColor: '#D4AF37' }]}
                                        textColor="#D4AF37"
                                        labelStyle={styles.buttonText}
                                    >
                                        İptal
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleChangePassword}
                                        style={styles.modalButton}
                                        buttonColor="#001F3F"
                                        labelStyle={styles.changeButtonText}
                                    >
                                        Değiştir
                                    </Button>
                                </View>
                            </Card.Content>
                        </Card>
                    </Modal>
                </Portal>
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
        gap: 16,
    },
    profileCard: {
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
        marginBottom: 16,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        marginRight: 20,
        backgroundColor: '#D4AF37',
    },
    profileInfo: {
        flex: 1,
        gap: 4,
    },
    profileName: {
        color: '#D4AF37',
        fontWeight: 'bold',
    },
    title: {
        color: '#FFFFFF',
        opacity: 0.8,
    },
    department: {
        color: '#FFFFFF',
    },
    detailsCard: {
        elevation: 4,
        borderRadius: 15,
        backgroundColor: '#11263E',
        padding: 16,
        marginTop: 16,
    },
    sectionTitle: {
        marginBottom: 24,
        fontWeight: '600',
        color: '#D4AF37',
        fontSize: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputGroup: {
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        padding: 16,
        borderRadius: 12,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: '#D4AF37',
    },
    iconLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconBackground: {
        backgroundColor: '#D4AF37',
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    label: {
        color: '#FFFFFF',
        marginLeft: 12,
        fontWeight: '500',
        fontSize: 16,
        opacity: 0.9,
    },
    infoValue: {
        color: '#FFFFFF',
        fontSize: 16,
        marginLeft: 44,
        opacity: 0.95,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginLeft: 44,
        height: 40,
    },
    buttonContainer: {
        marginTop: 24,
        gap: 12,
    },
    button: {
        borderRadius: 10,
        height: 48,
        justifyContent: 'center',
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
    logoutButton: {
        borderColor: '#FF3B30',
        borderWidth: 2,
    },
    modalContainer: {
        padding: 20,
        backgroundColor: 'transparent',
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
    },
    modalTitle: {
        color: '#11263E',
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    modalInput: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
    },
    inputText: {
        fontSize: 14,
        color: '#11263E',
        fontWeight: '500',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.25,
    },
    changeButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.25,
        color: '#FFFFFF',
        textTransform: 'uppercase',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 16,
    },
    modalButton: {
        minWidth: 100,
        borderRadius: 8,
    },
    infoSection: {
        marginTop: 16,
        gap: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    infoLabel: {
        width: 120,
        color: '#FFFFFF',
        fontWeight: '500',
    },
}); 