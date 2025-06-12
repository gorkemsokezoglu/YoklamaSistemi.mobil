export interface BaseUserData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'student' | 'academician';
  faculty: string;
  department: string;
}

export interface FaceImageData {
  face_image_base64: string;
}

export interface StudentCreate extends Omit<BaseUserData, 'role'> {
  role: 'student';
  student_number: string;
  class_: string;
  face_data?: FaceImageData[];
}

export interface AcademicianCreate extends Omit<BaseUserData, 'role'> {
  role: 'academician';
  academician_number: string;
}

export type RegisterRequest = StudentCreate | AcademicianCreate;

export interface BaseUserResponse {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  faculty: string;
  department: string;
}

export interface StudentResponse extends BaseUserResponse {
  student_number: string;
  class_: string;
}

export interface AcademicianResponse extends BaseUserResponse {
  academician_number: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

// E-posta doğrulama için yeni tipler
export interface VerificationCodeRequest {
  email: string;
}

export interface VerificationCodeVerify {
  email: string;
  code: string;
}

export interface VerificationCodeResponse {
  message: string;
  remaining_time: number;
}

export interface VerificationStatusResponse {
  message: string;
  email: string;
  verified: boolean;
}

// Şifre sıfırlama için yeni tipler
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordResponse {
  message: string;
  email: string;
}

export interface StudentProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  faculty: string;
  department: string;
  student_number: string;
  class_: string;
  role: 'student';
}

export interface AcademicianProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  faculty: string;
  department: string;
  academician_number: string;
  role: 'academician';
}

export interface StudentProfileUpdate {
  faculty?: string;
  department?: string;
  student_number?: string;
}

export interface StudentProfileResponse {
  student: StudentProfile;
} 