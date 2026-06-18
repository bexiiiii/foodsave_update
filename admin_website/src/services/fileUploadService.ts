import { axiosInstance } from './api/api';

export interface UploadResponse {
    message: string;
    url: string;
    filename: string;
    size: number;
    contentType: string;
}

export interface MultipleUploadResponse {
    uploadedFiles: UploadResponse[];
    successCount: number;
    totalCount: number;
    errors?: string[];
    errorCount?: number;
}

const TEN_MB = 10 * 1024 * 1024;

export class FileUploadService {
    private static readonly UPLOAD_ENDPOINT = '/upload';
    static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'] as const;
    static readonly SUPPORTED_FORMATS_LABEL = 'JPEG, PNG, GIF, WebP';

    /**
     * Upload a single image file
     */
    static async uploadImage(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post<UploadResponse>(
            `${this.UPLOAD_ENDPOINT}/image`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    /**
     * Upload multiple image files
     */
    static async uploadImages(files: File[]): Promise<MultipleUploadResponse> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await axiosInstance.post<MultipleUploadResponse>(
            `${this.UPLOAD_ENDPOINT}/images`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    /**
     * Upload a store logo image
     */
    static async uploadStoreLogo(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post<UploadResponse>(
            `${this.UPLOAD_ENDPOINT}/store-logo`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    /**
     * Delete an uploaded image
     */
    static async deleteImage(filename: string): Promise<void> {
        await axiosInstance.delete(`${this.UPLOAD_ENDPOINT}/image`, {
            params: { filename }
        });
    }

    /**
     * Validate file before upload
     */
    static validateImageFile(file: File): string | null {
        const maxSize = TEN_MB; // 10MB

        if (file.size > maxSize) {
            return 'Размер файла не должен превышать 10MB';
        }

        const fileType = file.type?.toLowerCase();
        if (!fileType || !this.ALLOWED_IMAGE_TYPES.includes(fileType)) {
            return `Разрешены только изображения (${this.SUPPORTED_FORMATS_LABEL})`;
        }

        return null;
    }

    /**
     * Convert file to base64 (fallback)
     */
    static convertToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    }
}
