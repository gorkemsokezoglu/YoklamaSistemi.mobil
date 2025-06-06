import { Faculty, FacultyResponse } from '../types/faculty';
import api from './api';

export const facultyService = {
    async getFaculties(page: number = 1, limit: number = 100): Promise<FacultyResponse> {
        try {
            console.log('Fakülte API isteği yapılıyor...');
            const response = await api.get('/faculties');
            console.log('Fakülte API ham yanıt:', response);
            
            // API yanıtını kontrol et
            if (!response.data) {
                throw new Error('API yanıtı boş');
            }

            // Eğer API direkt fakülte dizisi dönüyorsa, FacultyResponse formatına çevir
            if (Array.isArray(response.data)) {
                return {
                    data: response.data,
                    total: response.data.length,
                    page: 1,
                    limit: response.data.length
                };
            }

            return response.data;
        } catch (error) {
            console.error('Fakülte servisi hatası:', error);
            throw error;
        }
    },

    async getFaculty(facultyId: number): Promise<Faculty> {
        try {
            const response = await api.get(`/faculties/${facultyId}`);
            return response.data;
        } catch (error) {
            console.error(`Fakülte(${facultyId}) detayı alınırken hata:`, error);
            throw error;
        }
    }
}; 