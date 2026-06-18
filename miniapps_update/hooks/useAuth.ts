import { useState, useEffect, useCallback } from 'react';
import { apiClient, User, isAuthenticated } from '../lib/api';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  error: string | null;
  login: (initData: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticationAttempted, setAuthenticationAttempted] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      // Prevent multiple authentication checks
      if (authenticationAttempted) {
        setIsLoading(false);
        return;
      }

      try {
        setAuthenticationAttempted(true);
        
        if (isAuthenticated()) {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
          setIsLoggedIn(true);
          setError(null);
        }
      } catch (error) {
        console.error('Failed to get current user:', error);
        // Token might be invalid, clear everything
        apiClient.clearToken();
        setUser(null);
        setIsLoggedIn(false);
        setError(null); // Don't show error for invalid stored token
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [authenticationAttempted]);

  const login = useCallback(async (initData: string) => {
    // Prevent multiple login attempts
    if (isLoggedIn || isAuthenticating) {
      console.log('Login already in progress or user already logged in');
      return;
    }

    // Validate initData
    if (!initData || initData.trim() === '') {
      setError('Invalid Telegram data');
      return;
    }

    try {
      setIsLoading(true);
      setIsAuthenticating(true);
      setError(null);
      
      const authResponse = await apiClient.authenticateWithTelegram(initData);
      
      if (authResponse && authResponse.user) {
        setUser(authResponse.user);
        setIsLoggedIn(true);
        setAuthenticationAttempted(true);
        console.log('Login successful:', authResponse.user);
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      
      // Clear any partial authentication state
      apiClient.clearToken();
      setUser(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
      setIsAuthenticating(false);
    }
  }, [isLoggedIn, isAuthenticating]);

  const logout = useCallback(() => {
    apiClient.clearToken();
    setUser(null);
    setIsLoggedIn(false);
    setError(null);
    setAuthenticationAttempted(false);
    setIsAuthenticating(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    isLoggedIn,
    error,
    login,
    logout,
    clearError,
  };
};