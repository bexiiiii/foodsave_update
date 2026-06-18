"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/services/api';
import { Role, Permission, ROLES } from '@/types/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RoleWithPermissions extends Role {
    permissions: Permission[];
}

export default function RolesPage() {
    const [roles, setRoles] = useState<RoleWithPermissions[]>(ROLES);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);

    const handlePermissionToggle = async (role: RoleWithPermissions, permission: Permission) => {
        try {
            setLoading(true);
            const newPermissions = role.permissions.some(p => p.value === permission.value)
                ? role.permissions.filter(p => p.value !== permission.value)
                : [...role.permissions, permission];

            // TODO: Implement API call to update permissions
            // await api.put(`/api/roles/${role.name}/permissions`, { permissions: newPermissions });

            setRoles(roles.map(r => 
                r.name === role.name 
                    ? { ...r, permissions: newPermissions }
                    : r
            ));

            toast.success('Permissions updated successfully');
        } catch (error: any) {
            console.error('Failed to update permissions:', error);
            toast.error(error.response?.data?.message || 'Failed to update permissions');
        } finally {
            setLoading(false);
        }
    };

    const permissionGroups = {
        'User Management': ['user:'],
        'Store Management': ['store:'],
        'Product Management': ['product:'],
        'Order Management': ['order:'],
        'Analytics': ['analytics:'],
        'Review Management': ['review:'],
        'Discount Management': ['discount:'],
        'Category Management': ['category:']
    };

    if (loading && !roles.length) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="bg-white dark:bg-gray-800">
                            <CardContent className="p-6">
                                <Skeleton className="h-4 w-1/4 mb-2" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Roles & Permissions</h1>
                    <p className="text-red-500">{error}</p>
                    <Button 
                        onClick={() => setError(null)}
                        className="mt-4"
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Roles & Permissions</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage user roles and their permissions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role Selection */}
                <div className="space-y-4">
                    {roles.map((role) => (
                        <Card 
                            key={role.name} 
                            className={`bg-white dark:bg-gray-800 cursor-pointer transition-colors ${
                                selectedRole?.name === role.name 
                                    ? 'border-blue-500 dark:border-blue-400' 
                                    : ''
                            }`}
                            onClick={() => setSelectedRole(role)}
                        >
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-lg font-medium text-gray-900 dark:text-white">{role.name}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{role.description}</p>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {role.permissions.length} permissions
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Permission Management */}
                {selectedRole && (
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Permissions for {selectedRole.name}
                            </h2>
                            <div className="space-y-6">
                                {Object.entries(permissionGroups).map(([group, prefixes]) => (
                                    <div key={group}>
                                        <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">{group}</h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedRole.permissions
                                                .filter(p => prefixes.some(prefix => p.value.startsWith(prefix)))
                                                .map((permission) => (
                                                    <label
                                                        key={permission.value}
                                                        className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <Checkbox
                                                            checked={selectedRole.permissions.some(p => p.value === permission.value)}
                                                            onCheckedChange={() => handlePermissionToggle(selectedRole, permission)}
                                                            disabled={loading}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {permission.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {permission.description}
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
} 