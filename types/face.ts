export interface FaceData {
  id: string;
  student_id: string;
  face_images: string[];
}

export interface CreateFaceDataRequest {
  student_id: string;
  face_images: string[];
} 