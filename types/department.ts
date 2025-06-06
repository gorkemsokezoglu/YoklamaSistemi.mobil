export interface Department {
    id: number;
    name: string;
    code: string;
    facultyId: number;
    createdAt: string;
    updatedAt: string;
}

export interface DepartmentResponse {
    data: Department[];
    total: number;
    page: number;
    limit: number;
} 