"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { NotificationDTO } from '@/types/api';
import { format } from 'date-fns';
import { API_ENDPOINTS } from '@/config/api';
import { api } from '@/services/api';

interface NotificationFormData {
    title: string;
    message: string;
    type: NotificationDTO['type'];
    userId?: number;
}

interface TelegramBroadcastForm {
    title: string;
    message: string;
    buttonEnabled: boolean;
    buttonText: string;
    buttonUrl: string;
    imageUrl: string;
}

const createEmptyTelegramForm = (): TelegramBroadcastForm => ({
    title: '',
    message: '',
    buttonEnabled: false,
    buttonText: '',
    buttonUrl: '',
    imageUrl: '',
});

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
    const [sendingTelegram, setSendingTelegram] = useState(false);
    const [formData, setFormData] = useState<NotificationFormData>({
        title: '',
        message: '',
        type: 'INFO',
    });
    const [telegramForm, setTelegramForm] = useState<TelegramBroadcastForm>(() => createEmptyTelegramForm());

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.BASE);
            setNotifications(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Failed to load notifications');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await api.put(`${API_ENDPOINTS.NOTIFICATIONS.MARK_READ}/${notificationId}`);
            toast.success('Notification marked as read');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            toast.error('Failed to mark notification as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
            toast.success('All notifications marked as read');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            toast.error('Failed to mark all notifications as read');
        }
    };

    const handleCreateNotification = async () => {
        try {
            await api.post(API_ENDPOINTS.NOTIFICATIONS.BASE, formData);
            toast.success('Notification created successfully');
            setIsCreateModalOpen(false);
            resetForm();
            fetchNotifications();
        } catch (error) {
            console.error('Failed to create notification:', error);
            toast.error('Failed to create notification');
        }
    };

    const handleSendTelegramNotification = async () => {
        const trimmedMessage = telegramForm.message.trim();
        if (!trimmedMessage) {
            toast.error('Введите сообщение для Telegram');
            return;
        }

        const payload: Record<string, unknown> = {
            message: trimmedMessage,
            buttonEnabled: telegramForm.buttonEnabled,
        };

        const trimmedTitle = telegramForm.title.trim();
        if (trimmedTitle) {
            payload.title = trimmedTitle;
        }

        if (telegramForm.buttonEnabled) {
            const url = telegramForm.buttonUrl.trim();
            if (!url) {
                toast.error('Укажите ссылку для кнопки');
                return;
            }
            const buttonText = telegramForm.buttonText.trim() || 'Открыть';
            payload.buttonText = buttonText;
            payload.buttonUrl = url;
        }

        const imageUrl = telegramForm.imageUrl.trim();
        if (imageUrl) {
            payload.imageUrl = imageUrl;
        }

        setSendingTelegram(true);
        try {
            const response = await api.post(API_ENDPOINTS.NOTIFICATIONS.TELEGRAM_BROADCAST, payload);
            const recipients = response.data?.recipients ?? 0;
            toast.success(
                recipients > 0
                    ? `Уведомление отправлено ${recipients} пользователям`
                    : 'Уведомление отправлено'
            );
            setIsTelegramModalOpen(false);
            setTelegramForm(createEmptyTelegramForm());
            fetchNotifications();
        } catch (error) {
            console.error('Failed to send Telegram notification:', error);
            toast.error('Не удалось отправить уведомление в Telegram');
        } finally {
            setSendingTelegram(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            message: '',
            type: 'INFO',
        });
        setTelegramForm(createEmptyTelegramForm());
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    };

    const getTypeColor = (type: NotificationDTO['type']) => {
        switch (type) {
            case 'SUCCESS':
                return 'text-green-600 dark:text-green-500';
            case 'WARNING':
                return 'text-yellow-600 dark:text-yellow-500';
            case 'ERROR':
                return 'text-red-600 dark:text-red-500';
            case 'ORDER_UPDATE':
                return 'text-blue-600 dark:text-blue-500';
            case 'PROMOTION':
                return 'text-purple-600 dark:text-purple-500';
            case 'TELEGRAM':
                return 'text-sky-600 dark:text-sky-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 dark:bg-gray-900">
                <div className="mb-6">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="space-y-4">
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

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Notifications</h1>
                    <p className="text-gray-600 dark:text-gray-400">View and manage your notifications</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsTelegramModalOpen(true)}
                        className="bg-sky-600 hover:bg-sky-700 text-white"
                        disabled={sendingTelegram}
                    >
                        Telegram Broadcast
                    </Button>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Create Notification
                    </Button>
                    {notifications.length > 0 && (
                        <Button
                            onClick={handleMarkAllAsRead}
                            variant="outline"
                            className="bg-white dark:bg-gray-800"
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
            </div>

            <div className="mt-6">
                {notifications.length === 0 ? (
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-6 text-center">
                            <p className="text-gray-500 dark:text-gray-400">No notifications found</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
                        <Table>
                            <TableHeader className="bg-gray-50 dark:bg-gray-900/60">
                                <TableRow>
                                    <TableHead className="w-[220px]">Заголовок</TableHead>
                                    <TableHead className="w-[120px]">Тип</TableHead>
                                    <TableHead>Сообщение</TableHead>
                                    <TableHead className="w-[160px]">Дата</TableHead>
                                    <TableHead className="w-[120px]">Статус</TableHead>
                                    <TableHead className="w-[120px] text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications.map((notification) => {
                                    const isUnread = notification.status === 'unread';
                                    return (
                                        <TableRow key={notification.id} className={isUnread ? 'bg-blue-50/40 dark:bg-blue-500/5' : undefined}>
                                            <TableCell className="align-top">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {notification.title}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${getTypeColor(notification.type)}`}>
                                                    {notification.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <p className="max-w-xl whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                                                    {notification.message}
                                                </p>
                                            </TableCell>
                                            <TableCell className="align-top text-sm text-gray-500">
                                                {formatDate(notification.createdAt)}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        isUnread
                                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200'
                                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200'
                                                    }`}
                                                >
                                                    {isUnread ? 'Непрочитано' : 'Прочитано'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="align-top text-right">
                                                {isUnread ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                    >
                                                        Mark as read
                                                    </Button>
                                                ) : (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isTelegramModalOpen}
                onClose={() => {
                    setIsTelegramModalOpen(false);
                    setTelegramForm(createEmptyTelegramForm());
                }}
                className="max-w-[425px] p-5 lg:p-8"
            >
                <div>
                    <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                        Telegram Broadcast
                    </h4>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="telegram-title">Title</Label>
                            <Input
                                id="telegram-title"
                                value={telegramForm.title}
                                onChange={(e) => setTelegramForm({ ...telegramForm, title: e.target.value })}
                                placeholder="Optional title for the message"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="telegram-message">Message</Label>
                            <Textarea
                                id="telegram-message"
                                value={telegramForm.message}
                                onChange={(e) => setTelegramForm({ ...telegramForm, message: e.target.value })}
                                placeholder="Введите текст уведомления"
                                rows={4}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Сообщение увидят все пользователи Telegram мини-приложения.
                            </p>
                        </div>
                        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <Label htmlFor="telegram-button-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        Добавить кнопку
                                    </Label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Показывает кнопку с ссылкой. При клике мини-приложение откроет указанную страницу.
                                    </p>
                                </div>
                                <Switch
                                    id="telegram-button-toggle"
                                    checked={telegramForm.buttonEnabled}
                                    onCheckedChange={(checked) => {
                                        const isChecked = checked === true;
                                        setTelegramForm((prev) => ({
                                            ...prev,
                                            buttonEnabled: isChecked,
                                            ...(isChecked ? {} : { buttonText: '', buttonUrl: '' }),
                                        }));
                                    }}
                                />
                            </div>
                            {telegramForm.buttonEnabled && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="telegram-button-text">Текст кнопки</Label>
                                        <Input
                                            id="telegram-button-text"
                                            value={telegramForm.buttonText}
                                            onChange={(e) => setTelegramForm({ ...telegramForm, buttonText: e.target.value })}
                                            placeholder="Например, Открыть бокс"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="telegram-button-url">Ссылка или путь</Label>
                                        <Input
                                            id="telegram-button-url"
                                            value={telegramForm.buttonUrl}
                                            onChange={(e) => setTelegramForm({ ...telegramForm, buttonUrl: e.target.value })}
                                            placeholder="/stores/123 или https://..."
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Можно указать путь внутри мини-приложения или полную ссылку.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="telegram-image">Изображение (опционально)</Label>
                            <Input
                                id="telegram-image"
                                value={telegramForm.imageUrl}
                                onChange={(e) => setTelegramForm({ ...telegramForm, imageUrl: e.target.value })}
                                placeholder="https://.../image.jpg"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Если указать ссылку на изображение, оно появится над текстом уведомления.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-end w-full gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsTelegramModalOpen(false);
                                setTelegramForm(createEmptyTelegramForm());
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSendTelegramNotification}
                            className="bg-sky-600 hover:bg-sky-700 text-white"
                            disabled={sendingTelegram}
                        >
                            {sendingTelegram ? 'Sending…' : 'Send'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                className="max-w-[425px] p-5 lg:p-10"
            >
                <div>
                    <h4 className="mb-6 text-lg font-medium text-gray-800 dark:text-white/90">
                        Create Notification
                    </h4>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter notification title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="message">Message</Label>
                            <Input
                                id="message"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                placeholder="Enter notification message"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as NotificationDTO['type'] })}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            >
                                <option value="INFO">Info</option>
                                <option value="SUCCESS">Success</option>
                                <option value="WARNING">Warning</option>
                                <option value="ERROR">Error</option>
                                <option value="ORDER_UPDATE">Order Update</option>
                                <option value="PROMOTION">Promotion</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end w-full gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                resetForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateNotification}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Create
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
} 
