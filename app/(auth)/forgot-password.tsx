import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from 'react-native-paper';
import { authService } from '../../services/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    try {
      if (!email) {
        Alert.alert('Uyarı', 'E-posta adresi zorunludur.');
        return;
      }

      // E-posta formatı kontrolü
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Uyarı', 'Geçerli bir e-posta adresi giriniz.');
        return;
      }

      setLoading(true);
      const response = await authService.forgotPassword({ email });

      Alert.alert(
        'Kod Gönderildi',
        response.message,
        [
          {
            text: 'Tamam',
            onPress: () => router.push(`/(auth)/reset-password?email=${encodeURIComponent(email)}`)
          }
        ]
      );
    } catch (error: any) {
      let errorMessage = 'Şifre sıfırlama kodu gönderilemedi.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }

      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Şifremi Unuttum',
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
          <Text style={styles.title}>Şifremi Unuttum</Text>
          <Text style={styles.description}>
            E-posta adresinizi girin, size şifre sıfırlama kodu gönderelim.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Image 
                source={require('../../assets/images/user-icon.png')} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor="#B4B4B4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Button
              mode="contained"
              onPress={handleForgotPassword}
              loading={loading}
              disabled={loading}
              style={styles.button}
              labelStyle={styles.buttonText}
            >
              KOD GÖNDER
            </Button>

            <Button
              mode="text"
              onPress={() => router.back()}
              labelStyle={styles.backText}
            >
              Geri Dön
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
  backText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
}); 