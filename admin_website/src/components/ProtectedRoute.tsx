"use client";

import React from 'react';
import { redirect } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [], 
  redirectTo 
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        // Определяем куда редиректить в зависимости от роли
        let redirectPath = redirectTo;
        
        if (!redirectPath) {
          switch (user.role) {
            case 'STORE_MANAGER':
              redirectPath = '/analytics';
              break;
            case 'STORE_OWNER':
              redirectPath = '/';
              break;
            case 'SUPER_ADMIN':
              redirectPath = '/';
              break;
            default:
              redirectPath = '/signin';
          }
        }
        
        router.push(redirectPath);
      }
    }
  }, [user, loading, allowedRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
