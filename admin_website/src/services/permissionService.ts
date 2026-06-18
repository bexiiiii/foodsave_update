import { Permission } from '@/types/permission';
import { api } from './api';

class PermissionService {
    async checkPermission(permission: Permission): Promise<boolean> {
        try {
            const response = await api.get(`/permissions/check?permission=${permission}`);
            return response.data;
        } catch (error) {
            console.error('Error checking permission:', error);
            return false;
        }
    }

    async getUserPermissions(userId: string): Promise<Permission[]> {
        try {
            const response = await api.get(`/permissions/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting user permissions:', error);
            // For Super Admin, return all permissions
            return Object.values(Permission);
        }
    }

    async assignPermissionsToRole(roleName: string, permissions: Permission[]): Promise<void> {
        try {
            await api.post(`/permissions/roles/${roleName}/permissions`, permissions);
        } catch (error) {
            console.error('Error assigning permissions to role:', error);
            throw error;
        }
    }

    async removePermissionsFromRole(roleName: string, permissions: Permission[]): Promise<void> {
        try {
            await api.delete(`/permissions/roles/${roleName}/permissions`, { data: permissions });
        } catch (error) {
            console.error('Error removing permissions from role:', error);
            throw error;
        }
    }

    async updateUserRole(userId: number, newRole: string): Promise<void> {
        try {
            await api.put(`/permissions/users/${userId}/role?newRole=${newRole}`);
        } catch (error) {
            console.error('Error updating user role:', error);
            throw error;
        }
    }

    async updateUserPermissions(userId: string, permissions: Permission[]): Promise<void> {
        try {
            await api.put(`/permissions/users/${userId}/permissions`, permissions);
        } catch (error) {
            console.error('Error updating user permissions:', error);
            throw error;
        }
    }
}

export const permissionService = new PermissionService(); 