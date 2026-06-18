"use client";
import React, { useState } from 'react';
import { useNotifications } from '@/hooks/useApi';
import { NotificationDTO } from '@/types/api';
import Dropdown from '@/components/common/Dropdown';

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, loading, error, fetchNotifications } = useNotifications();

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            fetchNotifications();
        }
    };

    const closeDropdown = () => {
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                className="relative flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                aria-label="Переключить уведомления"
            >
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C11.4477 2 11 2.44772 11 3V4.25313C7.52651 5.15875 5 8.2724 5 12V17.5858L3.29289 19.2929C2.90237 19.6834 2.90237 20.3166 3.29289 20.7071C3.68342 21.0976 4.31658 21.0976 4.70711 20.7071L6 19.4142V12C6 9.23858 8.23858 7 11 7H13C15.7614 7 18 9.23858 18 12V19.4142L19.2929 20.7071C19.6834 21.0976 20.3166 21.0976 20.7071 20.7071C21.0976 20.3166 21.0976 19.6834 20.7071 19.2929L19 17.5858V12C19 8.2724 16.4735 5.15875 13 4.25313V3C13 2.44772 12.5523 2 12 2Z"
                        fill="currentColor"
                    />
                </svg>
                {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                        {notifications.length}
                    </span>
                )}
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
            >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                    <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                        Уведомления
                    </h5>
                    <button
                        onClick={toggleDropdown}
                        className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        aria-label="Закрыть уведомления"
                    >
                        <svg
                            className="fill-current"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-500">
                            Не удалось загрузить уведомления
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Нет уведомлений
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map((notification: NotificationDTO) => (
                                <div
                                    key={notification.id}
                                    className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors dark:border-gray-700 dark:hover:border-gray-600"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {notification.title}
                                        </h3>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded-full ${notification.type === 'ERROR'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                                    : notification.type === 'WARNING'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        : notification.type === 'SUCCESS'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}
                                        >
                                            {notification.type}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {notification.message}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-2">
                                        {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Dropdown>
        </div>
    );
}
