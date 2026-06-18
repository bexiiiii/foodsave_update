"use client";

import React from 'react';
import SignInForm from '@/components/auth/SignInForm';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-1">
                <SignInForm />
            </div>
            <div className="hidden lg:block lg:w-1/2 bg-brand-500">
                {/* Здесь можно добавить изображение или другой контент для правой части */}
            </div>
        </div>
    );
} 