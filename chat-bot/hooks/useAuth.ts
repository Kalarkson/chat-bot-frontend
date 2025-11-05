'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthResponse, LoginForm, RegisterForm } from '../types';
import { appConfig } from './useConfig'; 

const API_BASE_URL = appConfig.apiUrl;

export const useAuth = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        const userData: User = JSON.parse(savedUser);
        setUser(userData);
        setCookie('token', token);
        setCookie('user', savedUser);
      } catch (err) {
        console.error('Ошибка при загрузке пользователя:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const setCookie = (name: string, value: string, days: number = 7) => {
    if (typeof document !== 'undefined') {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      document.cookie = `${name}=${value}; expires=${expires}; path=/`;
    }
  };

  const deleteCookie = (name: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  };

  const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Ошибка: ${response.status}`);
      }
      return data;
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      } else {
        throw new Error('Ошибка сети. Проверьте подключение к интернету.');
      }
    }
  };

  const login = async (data: LoginForm): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setCookie('token', response.token);
      setCookie('user', JSON.stringify(response.user));
      console.log('Успешный вход, пользователь:', response.user);
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterForm): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response: AuthResponse = await fetchAPI('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });
      setUser(response.user);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setCookie('token', response.token);
      setCookie('user', JSON.stringify(response.user));
      console.log('Успешная регистрация, пользователь:', response.user);
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    deleteCookie('token');
    deleteCookie('user');
    setError(null);
    router.push('/login');
  };

  const checkAuth = (): boolean => {
    return !!user;
  };

  const clearError = (): void => {
    setError(null);
  };

  const updateUser = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCookie('user', JSON.stringify(userData));
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
    clearError,
    updateUser,
  };
};