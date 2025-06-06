export interface CourseSchedule {
    id: string;
    course_id: string;
    weekday: string;
    start_time: string;
    end_time: string;
    location?: string;
    created_at?: string;
    updated_at?: string;
}

export type CourseScheduleResponse = CourseSchedule[];