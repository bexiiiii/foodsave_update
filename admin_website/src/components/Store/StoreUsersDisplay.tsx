"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { UserDTO } from '@/types/api';
import { storeApi } from '@/services/api';
import { UserIcon, UsersIcon } from 'lucide-react';

interface StoreUsersDisplayProps {
  storeId: number;
}

export const StoreUsersDisplay: React.FC<StoreUsersDisplayProps> = ({ storeId }) => {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoreUsers();
  }, [storeId]);

  const loadStoreUsers = async () => {
    try {
      setLoading(true);
      const response = await storeApi.getStoreUsers(storeId);
      const usersData = Array.isArray(response) ? response : response.content || [];
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading store users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пользователи заведения</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-blue-500" />
          Пользователи заведения
          <Badge variant="outline">{users.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>К этому заведению не привязаны пользователи</p>
            <p className="text-sm">Обратитесь к администратору для добавления доступа</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Пользователь</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      {user.firstName} {user.lastName}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
