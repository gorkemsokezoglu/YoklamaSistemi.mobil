import { CourseScheduleResponse } from '../types/courseSchedule';
import api from './api';

export const courseScheduleService = {
    async getCourseSchedules(page: number = 1, limit: number = 100): Promise<CourseScheduleResponse> {
        const response = await api.get(`/course-schedules?skip=${(page - 1) * limit}&limit=${limit}`);
        return response.data;
    },

    async getCourseSchedulesByCourse(courseId: string, page: number = 1, limit: number = 100): Promise<CourseScheduleResponse> {
        const response = await api.get(`/course-schedules/course/${courseId}?skip=${(page - 1) * limit}&limit=${limit}`);
        return response.data;
    }
}; 