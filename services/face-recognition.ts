import { CreateFaceDataRequest, FaceData } from '../types/face';
import api from './api';

interface FaceRecognitionResponse {
    message: string;
    student_info?: {
        id: string;
        student_number: string;
        faculty: string;
        department: string;
        first_name: string;
        last_name: string;
        email: string;
    };
    datetime_info: {
        weekday: string;
        date: string;
        time: string;
    };
    course_info: {
        id: string;
        name: string;
        code: string;
        schedule?: {
            weekday: string;
            start_time: string;
            end_time: string;
            location: string;
            is_active: boolean;
            status: 'active' | 'not_started' | 'ended';
        };
    };
    attendance?: {
        id: string;
        status: 'created' | 'already_exists';
        message: string;
    };
}

interface AttendanceResponse {
    message: string;
    course_info: {
        name: string;
        code: string;
        date: string;
        time: string;
        weekday: string;
    };
    attendance_records: Array<{
        student_number: string;
        student_name: string;
        status: string;
        message: string;
    }>;
}

export const faceRecognitionService = {
    // Yüz verisi yükleme
    createFaceData: async (data: CreateFaceDataRequest): Promise<FaceData> => {
        const response = await api.post('/face-data', data);
        return response.data;
    },

    // Çoklu yüz verisi yükleme (kayıt sırasında)
    uploadMultipleFaceData: async (images: string[]): Promise<FaceData[]> => {
        const response = await api.post('/face-data/upload-multiple', {
            images: images // base64 formatında resimler dizisi
        });
        return response.data;
    },

    // Öğrencinin yüz verisini getirme
    getMyFaceData: async (): Promise<FaceData[]> => {
        const response = await api.get('/face-data/my-face-data');
        return response.data;
    },

    // Belirli bir öğrencinin yüz verisini getirme (akademisyen için)
    getStudentFaceData: async (studentId: string): Promise<FaceData[]> => {
        const response = await api.get(`/face-data/${studentId}`);
        return response.data;
    },

    // Yoklama için yüz tanıma
    identifyFace: async (courseId: string): Promise<FaceRecognitionResponse> => {
        try {
            const response = await api.post(`/face-recognition/identify/${courseId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Roboflow ile yoklama alma
    takeAttendanceWithRoboflow: async (courseId: string, imageUri: string): Promise<AttendanceResponse> => {
        try {
            console.log('Roboflow ile yoklama alınıyor:', { courseId, imageUri });
            
            // FormData oluştur
            const formData = new FormData();
            
            // @ts-ignore - React Native'in FormData tipi farklı
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'attendance.jpg'
            });

            // API isteği için özel headers
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };

            const response = await api.post<AttendanceResponse>(`/roboflow/take-attendance/${courseId}`, formData, config);
            console.log('Roboflow yoklama sonucu:', response.data);
            return response.data;
        } catch (error) {
            console.error('Roboflow yoklama servisi hatası:', error);
            throw error;
        }
    },
}; 