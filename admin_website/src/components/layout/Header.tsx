import React from 'react';
import Link from 'next/link';
import ApiService from '@/services/api';

const api = ApiService.getInstance();

export default function Header() {
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between w-full h-16 px-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center">
        <Link href="/" className="text-xl font-bold text-gray-800 dark:text-white">
          Панель администратора FoodSave
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Выйти
        </button>
      </div>
    </header>
  );
}