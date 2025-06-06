import { StudentProfile } from '../types/auth';
import api from './api';

export const studentService = {
    getMe: async (): Promise<StudentProfile> => {
        try {
            console.log('Öğrenci bilgileri getiriliyor');
            const response = await api.get<StudentProfile>('/students/me');
            console.log('Öğrenci bilgileri alındı:', response.data);
            return response.data;
        } catch (error) {
            console.error('Öğrenci bilgileri getirme servisi hatası:', error);
            throw error;
        }
    },

    updateStudent: async (studentId: string, data: Partial<StudentProfile>): Promise<StudentProfile> => {
        try {
            console.log('Öğrenci güncelleniyor:', studentId);
            const response = await api.put<StudentProfile>(`/students/${studentId}`, data);
            console.log('Öğrenci güncellendi:', response.data);
            return response.data;
        } catch (error) {
            console.error('Öğrenci güncelleme servisi hatası:', error);
            throw error;
        }
    }
}; 