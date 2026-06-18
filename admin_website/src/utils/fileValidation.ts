import { toast } from "sonner";

/**
 * Максимальный размер файла (15MB в байтах)
 */
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Поддерживаемые типы изображений
 */
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
];

/**
 * Валидирует файл изображения
 * @param file - файл для валидации
 * @param showToast - показывать ли toast сообщения об ошибках (по умолчанию true)
 * @returns true если файл прошел валидацию, false если нет
 */
export function validateImageFile(file: File, showToast = true): boolean {
    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
        const sizeInMB = (file.size / 1024 / 1024).toFixed(2);
        const maxSizeInMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
        
        if (showToast) {
            toast.error(`Размер файла не должен превышать ${maxSizeInMB}MB. Размер выбранного файла: ${sizeInMB}MB`);
        }
        return false;
    }

    // Проверка типа файла
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        if (showToast) {
            toast.error('Поддерживаются только изображения форматов: JPEG, PNG, GIF, WebP');
        }
        return false;
    }

    return true;
}

/**
 * Форматирует размер файла в человекочитаемый вид
 * @param bytes - размер в байтах
 * @returns отформатированная строка
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Получает информацию о файле для отображения
 * @param file - файл
 * @returns объект с информацией о файле
 */
export function getFileInfo(file: File) {
    return {
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        lastModified: new Date(file.lastModified).toLocaleDateString()
    };
}
