import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loadUser } = useAuth();

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Uyarı', 'E-posta ve şifre alanları zorunludur.');
        return;
      }

      setLoading(true);
      const response = await authService.login({
        email,
        password,
      });

      if (!response.token) {
        Alert.alert('Uyarı', 'Giriş yapılamadı. Lütfen tekrar deneyin.');
        return;
      }

      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));

      // Kullanıcı bilgilerini yükle
      await loadUser();

      if (response.user.role === 'student') {
        router.replace('/(student)');
      } else {
        router.replace('/(academician)');
      }
    } catch (error: any) {
      let errorMessage = 'Giriş yapılamadı. Lütfen e-posta ve şifrenizi kontrol edin.';
      
      // E-posta doğrulama hatası kontrolü
      if (error.response?.status === 403 && error.response?.data?.detail?.includes('e-posta adresinizi doğrulayın')) {
        Alert.alert(
          'E-posta Doğrulama Gerekli',
          'Lütfen önce e-posta adresinizi doğrulayın. E-posta kutunuzu kontrol edin.',
          [
            {
              text: 'İptal',
              style: 'cancel'
            },
            {
              text: 'Doğrula',
              onPress: () => router.push({
                pathname: '/(auth)/email-verification',
                params: { email }
              })
            }
          ]
        );
        return;
      }
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert('Uyarı', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/iucLogo3.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Image 
              source={require('../../assets/images/user-icon.png')} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-Posta"
              placeholderTextColor="#B4B4B4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonText}
          >
            GİRİŞ YAP
          </Button>

          <Link href="/(auth)/register" asChild>
            <Text style={styles.registerText}>
              Hesabınız yok mu? Kayıt olun
            </Text>
          </Link>

          <Link href="/(auth)/forgot-password" asChild>
            <Text style={styles.forgotPasswordText}>
              Şifremi Unuttum
            </Text>
          </Link>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#11263E',
    padding: 20,
    justifyContent: 'flex-start',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '45%', // Logo alanını biraz azalttım
    marginBottom: 0, // Alt boşluğu kaldırdım
  },
  logo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  universityName: {
    fontSize: 24,
    color: '#D4AF37', // İÜC Altın Sarısı
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 2,
  },
  form: {
    gap: 15, // Input'lar arası boşluğu azalttım
    paddingHorizontal: 20,
    marginTop: -20, // Form'u yukarı çektim
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A3A5A',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 45,
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
  button: {
    backgroundColor: '#D4AF37',
    borderRadius: 25,
    height: 45,
    justifyContent: 'center',
    marginTop: 15,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
  },
  registerText: {
    color: '#D4AF37',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  forgotPasswordText: {
    color: '#B4B4B4',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default Login; 



