export interface Faculty {
    id: number;
    name: string;
    code: string;
    createdAt: string;
    updatedAt: string;
}

export interface FacultyResponse {
    data: Faculty[];
    total: number;
    page: number;
    limit: number;
} 