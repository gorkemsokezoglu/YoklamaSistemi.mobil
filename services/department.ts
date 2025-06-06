import { Department, DepartmentResponse } from '../types/department';
import api from './api';

export const departmentService = {
    async getDepartments(page: number = 1, limit: number = 100): Promise<DepartmentResponse> {
        try {
            console.log('Bölüm API isteği yapılıyor...');
            const response = await api.get(`/departments?skip=${(page - 1) * limit}&limit=${limit}`);
            console.log('Bölüm API ham yanıt:', response);
            
            // API yanıtını kontrol et
            if (!response.data) {
                throw new Error('API yanıtı boş');
            }

            // Eğer API direkt bölüm dizisi dönüyorsa, DepartmentResponse formatına çevir
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
            console.error('Bölüm servisi hatası:', error);
            throw error;
        }
    },

    async getDepartmentsByFaculty(facultyId: number, page: number = 1, limit: number = 100): Promise<DepartmentResponse> {
        try {
            console.log(`${facultyId} ID'li fakültenin bölümleri yükleniyor...`);
            const response = await api.get(`/departments/faculty/${facultyId}?skip=${(page - 1) * limit}&limit=${limit}`);
            console.log('Fakülteye göre bölüm API yanıtı:', response);

            // API yanıtını kontrol et
            if (!response.data) {
                throw new Error('API yanıtı boş');
            }

            // Eğer API direkt bölüm dizisi dönüyorsa, DepartmentResponse formatına çevir
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
            console.error(`Fakülte(${facultyId}) bölümleri yüklenirken hata:`, error);
            throw error;
        }
    },

    async getDepartment(departmentId: number): Promise<Department> {
        try {
            const response = await api.get(`/departments/${departmentId}`);
            return response.data;
        } catch (error) {
            console.error(`Bölüm(${departmentId}) detayı alınırken hata:`, error);
            throw error;
        }
    }
}; 