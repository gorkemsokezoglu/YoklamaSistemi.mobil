import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

interface AttendanceRecord {
    id: string;
    student: {
        user: {
            first_name: string;
            last_name: string;
        };
        student_number: string;
    };
    status: boolean;
}

interface AttendanceReport {
    course: {
        name: string;
        code: string;
    };
    date: string;
    attendance_records: AttendanceRecord[];
    present_count: number;
    absent_count: number;
    total_count: number;
}

export const reportService = {
    /**
     * API'nin base URL'ini döndürür
     */
    getBaseUrl: () => {
        const baseUrl = api.defaults.baseURL;
        return baseUrl?.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    },

    /**
     * Kullanıcının token'ını döndürür
     */
    getToken: async () => {
        return await AsyncStorage.getItem('token');
    },

    /**
     * Belirli bir dersin belirli bir tarihteki yoklama raporunu PDF olarak alır
     * @param courseId - Dersin UUID'si
     * @param date - Yoklama tarihi (YYYY-MM-DD formatında)
     * @returns PDF blob
     */
    getAttendanceReport: async (courseId: string, date: string): Promise<Blob> => {
        try {
            const response = await api.get(
                `reports/attendance/${courseId}/${date}`,
                { responseType: 'blob' }
            );
            return response.data;
        } catch (error) {
            console.error('Yoklama raporu alınırken hata:', error);
            throw error;
        }
    }
}; 