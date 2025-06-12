import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#fff' },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            title: 'Giriş Yap',
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: 'Kayıt Ol',
          }}
        />
        <Stack.Screen
          name="email-verification"
          options={{
            title: 'E-posta Doğrulama',
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: 'Şifremi Unuttum',
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            title: 'Şifre Sıfırla',
          }}
        />
      </Stack>
    </View>
  );
} 