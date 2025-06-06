import { AcademicianProfile } from '../types/auth';
import api from './api';

export const academicianService = {
  getAcademician: async (academicianId: string): Promise<AcademicianProfile> => {
    try {
      console.log('Akademisyen getiriliyor:', academicianId);
      const response = await api.get<AcademicianProfile>(`/academicians/${academicianId}`);
      console.log('Akademisyen alındı:', response.data);
      return response.data;
    } catch (error) {
      console.error('Akademisyen getirme servisi hatası:', error);
      throw error;
    }
  },

  updateAcademician: async (academicianId: string, data: Partial<AcademicianProfile>): Promise<AcademicianProfile> => {
    try {
      console.log('Akademisyen güncelleniyor:', academicianId);
      const response = await api.put<AcademicianProfile>(`/academicians/${academicianId}`, data);
      console.log('Akademisyen güncellendi:', response.data);
      return response.data;
    } catch (error) {
      console.error('Akademisyen güncelleme servisi hatası:', error);
      throw error;
    }
  },

  getMe: async (): Promise<AcademicianProfile> => {
    try {
      console.log('Giriş yapan akademisyen bilgileri getiriliyor');
      const response = await api.get<AcademicianProfile>('/academicians/me');
      console.log('Akademisyen bilgileri alındı:', response.data);
      return response.data;
    } catch (error) {
      console.error('Akademisyen bilgileri getirme servisi hatası:', error);
      throw error;
    }
  }
}; 