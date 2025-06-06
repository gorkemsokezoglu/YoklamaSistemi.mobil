export interface CourseSchedule {
    id: string;
    weekday: string;
    start_time: string;
    end_time: string;
    location: string;
}

export interface Course {
    id: string;
    name: string;
    code: string;
    academician_id: string | null;
    created_at: string;
    attendances_rate_limit: number | null;
    attendance_rate?: number; // Öğrencinin mevcut katılım oranı
    schedules: CourseSchedule[];
    students: any[]; // Öğrenci listesi
    updated_at: string;
}

export interface CreateCourseRequest {
  name: string;
  code: string;
  academician_id?: string;
  attendances_rate_limit?: number;
}

export interface UpdateCourseRequest {
  name?: string;
  code?: string;
  academician_id?: string;
  attendances_rate_limit?: number;
}

// Öğrenci Ders Seçimi
export interface StudentCourseSelection {
  id: string;
  student_id: string;
  course_id: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Ders Seçimi İsteği
export interface CreateStudentCourseSelectionRequest {
  student_id: string;
  course_ids: string[];
  is_approved: boolean | null;
}

// Akademisyen Ders Seçimi
export interface AcademicianCourseSelection {
  id: string;
  academician_id: string;
  course_id: string;
  is_approved: boolean;
}

export interface CreateAcademicianCourseSelectionRequest {
  academician_id: string;
  course_id: string;
  is_approved: boolean | null;
}

export interface PerformanceRecord {
  id: string;
  student_id: string;
  course_id: string;
  attendance_rate: number; // 0-1 arası decimal değer
  created_at: string;
}

export interface CreatePerformanceRecordRequest {
  student_id: string;
  course_id: string;
  attendance_rate: number;
}

export interface UpdatePerformanceRecordRequest {
  attendance_rate: number;
}

export interface CourseAttendance {
  id: string;
  course_id: string;
  student_id: string;
  date: string;
  status: boolean;
  face_recognition_data?: {
    confidence: number;
    matched: boolean;
  };
}

export interface AttendanceStats {
  total_classes: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  faculty: string;
  department: string;
  student_number: string;
  selection_status: boolean;
  selection_date: string;
  class_: string;
} 