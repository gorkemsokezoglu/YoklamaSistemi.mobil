import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { academicianService } from '../services/academician';
import { authService } from '../services/auth';
import { studentService } from '../services/student';

type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'academician';
  faculty: string;
  department: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
    console.log('AuthProvider initialized');
  }, []);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      console.log('Loading user...');
      const token = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      console.log('Stored token:', token);
      console.log('Stored user:', storedUser);

      if (token && storedUser) {
        const userJson = JSON.parse(storedUser);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub;
        const role = userJson.role;

        console.log('User ID:', userId);
        console.log('Role:', role);

        try {
          let userDetails;
          if (role === 'student') {
            userDetails = await studentService.getMe();
            console.log('Student details:', userDetails);
          } else if (role === 'academician') {
            userDetails = await academicianService.getMe();
            console.log('Academician details:', userDetails);
          }

          if (userDetails) {
            const userData = {
              id: userDetails.user_id,
              email: userDetails.email,
              first_name: userDetails.first_name,
              last_name: userDetails.last_name,
              role: role as 'student' | 'academician',
              faculty: userDetails.faculty,
              department: userDetails.department
            };
            console.log('Setting user data:', userData);
            setUser(userData);
            setError(null);
          }
        } catch (apiError: any) {
          console.error('API error:', apiError);
          // 401 hatası durumunda sessizce token'ı temizle ve kullanıcıyı çıkış yapmış say
          if (apiError?.response?.status === 401) {
            await AsyncStorage.multiRemove(['token', 'user']);
            setUser(null);
            setError(null);
          } else {
            // Diğer API hataları için hata mesajı göster
            setError('Kullanıcı bilgileri yüklenemedi');
          }
        }
      } else {
        console.log('No stored token or user found');
        setUser(null);
        setError(null);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
      await AsyncStorage.multiRemove(['token', 'user']);
      // Sadece kritik hatalarda hata mesajı göster
      if (error instanceof Error && error.message !== 'Token expired') {
        setError('Bir hata oluştu');
      } else {
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      // AsyncStorage'dan token ve user bilgilerini temizle
      await AsyncStorage.multiRemove(['token', 'user']);
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      setError('Çıkış yapılırken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    error,
    loadUser,
    logout
  };

  console.log('AuthProvider value:', value);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 