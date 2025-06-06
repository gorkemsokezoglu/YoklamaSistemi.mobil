import { AcademicianCreate, AcademicianResponse, ChangePasswordRequest, LoginRequest, LoginResponse, RegisterRequest, StudentCreate, StudentResponse } from '../types/auth';
import api from './api';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await api.post('/auth/token', {
        email: data.email,
        password: data.password
      });

      // access_token'dan user_id'yi çıkaralım (JWT'nin payload kısmı)
      const token = response.data.access_token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.sub;

      return {
        token: response.data.access_token,
        token_type: response.data.token_type,
        user: {
          id: userId,
          email: data.email,
          role: response.data.role
        }
      };
    } catch (error) {
      throw error;
    }
  },

  register: async (data: RegisterRequest): Promise<StudentResponse | AcademicianResponse> => {
    try {
      const response = await api.post('/auth/register', {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        role: data.role,
        faculty: data.faculty,
        department: data.department,
        ...(data.role === 'student' ? {
          student_number: (data as StudentCreate).student_number,
          class_: (data as StudentCreate).class_,
          face_data: (data as StudentCreate).face_data
        } : {
          academician_number: (data as AcademicianCreate).academician_number
        })
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.detail === "Bu email adresi zaten kayıtlı") {
        throw new Error("Bu email adresi zaten kayıtlı");
      }
      throw error;
    }
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    try {
      await api.post('/auth/change-password', data);
    } catch (error) {
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      throw error;
    }
  },

  getUserById: async (userId: string) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
}; 