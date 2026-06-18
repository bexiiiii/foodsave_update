"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { UserDTO, StoreDTO } from '@/types/api';
import { userApi, storeApi } from '@/services/api';
import { UserIcon, StoreIcon, LinkIcon, UnlinkIcon, PlusIcon, SearchIcon } from 'lucide-react';

interface UserStoreAssignmentProps {
  onAssignmentChange?: () => void;
}

export const UserStoreAssignment: React.FC<UserStoreAssignmentProps> = ({ onAssignmentChange }) => {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [storeUsers, setStoreUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadStoreUsers();
    }
  }, [selectedStore]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [usersResponse, storesResponse] = await Promise.all([
        userApi.getAll(),
        storeApi.getAll()
      ]);
      
      // Handle different response formats
      const usersData = Array.isArray(usersResponse) ? usersResponse : [];
      const storesData = Array.isArray(storesResponse) ? storesResponse : (storesResponse as any)?.content || [];
      
      setUsers(usersData);
      setStores(storesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadStoreUsers = async () => {
    if (!selectedStore) return;
    
    try {
      const response = await storeApi.getStoreUsers(parseInt(selectedStore));
      const usersData = Array.isArray(response) ? response : (response as any)?.content || [];
      setStoreUsers(usersData);
    } catch (error) {
      console.error('Error loading store users:', error);
      toast.error('Ошибка загрузки пользователей заведения');
    }
  };

  const handleAssignUser = async () => {
    if (!selectedStore || !selectedUser) {
      toast.error('Выберите заведение и пользователя');
      return;
    }

    try {
      setAssigning(true);
      await storeApi.assignUserToStore(parseInt(selectedStore), parseInt(selectedUser));
      toast.success('Пользователь успешно привязан к заведению');
      setSelectedUser('');
      setIsDialogOpen(false);
      await loadStoreUsers();
      onAssignmentChange?.();
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Ошибка привязки пользователя');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignUser = async (userId: number) => {
    if (!selectedStore) return;

    try {
      await storeApi.unassignUserFromStore(parseInt(selectedStore), userId);
      toast.success('Пользователь отвязан от заведения');
      await loadStoreUsers();
      onAssignmentChange?.();
    } catch (error) {
      console.error('Error unassigning user:', error);
      toast.error('Ошибка отвязки пользователя');
    }
  };

  const filteredUsers = users.filter(user => 
    !storeUsers.some(storeUser => storeUser.id === user.id) &&
    (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Управление пользователями заведений</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-blue-500" />
          Управление пользователями заведений
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Store Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Выберите заведение:</label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите заведение..." />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-4 w-4" />
                    {store.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedStore && (
          <div className="space-y-4">
            {/* Add User Dialog */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Пользователи заведения</h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Добавить пользователя
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить пользователя в заведение</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Поиск пользователя:</label>
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Введите имя или email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Выберите пользователя:</label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите пользователя..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                {user.firstName} {user.lastName} ({user.email})
                                <Badge variant="outline">{user.role}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAssignUser} 
                        disabled={!selectedUser || assigning}
                        className="flex-1"
                      >
                        {assigning ? 'Добавление...' : 'Добавить'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        В этом заведении пока нет пользователей
                      </TableCell>
                    </TableRow>
                  ) : (
                    storeUsers.map((user) => (
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
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUnassignUser(user.id)}
                          >
                            <UnlinkIcon className="h-4 w-4 mr-2" />
                            Отвязать
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
