import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission, PERMISSION_DESCRIPTIONS } from '@/types/permission';
import { permissionService } from '@/services/permissionService';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionManagerProps {
    roleName: string;
    onUpdate?: () => void;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({ roleName, onUpdate }) => {
    const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { hasPermission } = usePermissions();

    useEffect(() => {
        loadPermissions();
    }, [roleName]);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            const permissions = await permissionService.getUserPermissions("0"); // TODO: Get role permissions
            setSelectedPermissions(permissions);
            setError(null);
        } catch (err) {
            setError('Failed to load permissions');
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (permission: Permission) => {
        setSelectedPermissions(prev => {
            if (prev.includes(permission)) {
                return prev.filter(p => p !== permission);
            } else {
                return [...prev, permission];
            }
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await permissionService.updateUserPermissions("0", selectedPermissions); // TODO: Get role permissions
            setSuccess('Permissions updated successfully');
            setError(null);
            onUpdate?.();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to update permissions');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Разрешения: {roleName}</CardTitle>
                </CardHeader>
                <CardContent>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="mb-4">
                            <Skeleton className="h-4 w-3/4 mb-2" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Разрешения: {roleName}</CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-md p-3">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-md p-3">
                        {success}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.values(Permission).map((permission) => (
                        <div key={permission} className="flex items-start space-x-2">
                            <Checkbox
                                id={permission}
                                checked={selectedPermissions.includes(permission)}
                                onCheckedChange={() => handlePermissionChange(permission)}
                                disabled={!hasPermission(Permission.USER_UPDATE)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor={permission}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {permission}
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    {PERMISSION_DESCRIPTIONS[permission]}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={!hasPermission(Permission.USER_UPDATE) || saving}
                    >
                        {saving ? 'Saving...' : 'Save Permissions'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}; 