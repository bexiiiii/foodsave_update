import { useState, useEffect, useCallback } from 'react';

import { BASE_URL } from '@/config/api';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  active: boolean;
  profilePicture?: string;
  phone?: string;
  address?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setUser(data || null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const authData = await response.json();
        const { accessToken, user: userData } = authData;
        
        setUser(userData);
        
        // Сохраняем токен в localStorage
        localStorage.setItem('token', accessToken);
        localStorage.setItem('userRole', userData.role);
        
        return userData;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
        
      if (token) {
        // Попытаемся вызвать logout на бэкенде
        try {
          await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (error) {
          console.log('Backend logout failed, continuing with local logout');
        }
      }
      
      setUser(null);
      
      // Удаляем токен из localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          const response = await fetch(`${BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            
            // Обновляем роль в localStorage
            localStorage.setItem('userRole', userData.role);
          } else {
            // Токен невалидный, удаляем его
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            setUser(null);
          }
        } catch (error) {
          console.log('Token validation failed, clearing token');
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          setUser(null);
        }
      } else {
        // Если токена нет, пользователь не аутентифицирован
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Функция для смены роли (для разработки)
  const switchRole = useCallback(async (role: string) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/dev-login?role=${role}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const authData = await response.json();
        const { accessToken, user: userData } = authData;
        
        localStorage.setItem('token', accessToken);
        localStorage.setItem('userRole', userData.role);
        
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Role switch error:', error);
    }
  }, []);

  return {
    user,
    loading,
    login,
    logout,
    switchRole,
    isAuthenticated: !!user
  };
};