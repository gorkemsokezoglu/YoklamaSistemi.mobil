import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { authService } from '../../services/auth';

export default function EmailVerificationScreen() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    if (params.email) {
      setEmail(params.email as string);
    }
  }, [params.email]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [remainingTime]);

  const handleVerifyCode = async () => {
    try {
      if (!email || !verificationCode) {
        Alert.alert('Uyarı', 'E-posta ve doğrulama kodu alanları zorunludur.');
        return;
      }

      if (verificationCode.length !== 6) {
        Alert.alert('Uyarı', 'Doğrulama kodu 6 haneli olmalıdır.');
        return;
      }

      setLoading(true);
      const response = await authService.verifyCode({
        email,
        code: verificationCode
      });

      Alert.alert(
        'Başarılı',
        response.message,
        [
          {
            text: 'Giriş Yap',
            onPress: () => router.replace('/(auth)/login')
          }
        ]
      );
    } catch (error: any) {
      let errorMessage = 'Doğrulama kodu kontrol edilemedi.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      if (!email) {
        Alert.alert('Uyarı', 'E-posta adresi gereklidir.');
        return;
      }

      setResendLoading(true);
      const response = await authService.resendVerificationCode({ email });
      
      setRemainingTime(response.remaining_time);
      Alert.alert('Başarılı', response.message);
    } catch (error: any) {
      let errorMessage = 'Doğrulama kodu gönderilemedi.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert('Hata', errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'E-posta Doğrulama',
          headerStyle: {
            backgroundColor: '#11263E',
          },
          headerTintColor: '#D4AF37',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/iucLogo3.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>E-posta Doğrulama</Text>
          <Text style={styles.description}>
            {email} adresine gönderilen 6 haneli doğrulama kodunu giriniz.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor="#B4B4B4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!params.email}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Doğrulama Kodu (6 haneli)"
                placeholderTextColor="#B4B4B4"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleVerifyCode}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonText}
            >
              DOĞRULA
            </Button>

            <View style={styles.resendContainer}>
              {remainingTime > 0 ? (
                <Text style={styles.timerText}>
                  Yeni kod gönderebilmek için {formatTime(remainingTime)} bekleyin
                </Text>
              ) : (
                <Button
                  mode="text"
                  onPress={handleResendCode}
                  loading={resendLoading}
                  disabled={resendLoading}
                  labelStyle={styles.resendText}
                >
                  Kodu Yeniden Gönder
                </Button>
              )}
            </View>

            <Button
              mode="text"
              onPress={() => router.replace('/(auth)/login')}
              labelStyle={styles.backText}
            >
              Giriş Sayfasına Dön
            </Button>
          </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    color: '#D4AF37',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    gap: 15,
  },
  inputContainer: {
    backgroundColor: '#1A3A5A',
    borderRadius: 25,
    paddingHorizontal: 20,
    height: 50,
    justifyContent: 'center',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#D4AF37',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    marginTop: 15,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  timerText: {
    color: '#B4B4B4',
    fontSize: 14,
    textAlign: 'center',
  },
  resendText: {
    color: '#D4AF37',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
}); 