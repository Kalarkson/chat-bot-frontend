'use client';
import React, { useState } from 'react';
import { LoginForm, RegisterForm } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  loading,
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      className={`bg-[#5686fe] text-white py-3 px-6 rounded-xl hover:bg-[#4970fe]
                 transition-colors duration-200 font-medium disabled:opacity-50
                 disabled:cursor-not-allowed ${className}`}
      disabled={loading || props.disabled}
    >
      {loading ? 'Загрузка...' : children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <div className="space-y-2">
      <label className="text-gray-300 text-sm font-medium">{label}</label>
      <input
        {...props}
        className={`w-full bg-[#1e1e20] border border-[#38383a] text-white
                   rounded-xl px-4 py-3 outline-none focus:ring-2
                   focus:ring-[#5686fe] focus:border-transparent
                   placeholder-gray-500 ${className}`}
      />
    </div>
  );
};

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState<LoginForm & RegisterForm>({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, register, loading, error: authError, clearError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setLocalError('Пароли не совпадают');
      return;
    }
    
    if (formData.password.length < 6) {
      setLocalError('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      if (isLogin) {
        await login(formData);
        router.push('/');
      } else {
        await register(formData);
        router.push('/');
      }
    } catch (err) {
      console.log('Ошибка в форме:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (localError) setLocalError(null);
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setLocalError(null);
    clearError();
  };

  const errorMessage = localError || authError;

  return (
    <div className="min-h-screen bg-[#151517] flex items-center justify-center p-4">
      <div className="bg-chat-input p-6 mobile:p-8 rounded-2xl ring-1 ring-[#38383a] w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl mobile:text-3xl font-bold text-white mb-2">
            Добро пожаловать
          </h1>
          <p className="text-gray-400 text-sm mobile:text-base">
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          <Input
            key="username"
            label="Имя пользователя"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Введите имя пользователя"
            required
            disabled={loading}
          />

          <Input
            key="password"
            label="Пароль"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Введите пароль"
            required
            disabled={loading}
          />

          {!isLogin && (
            <Input
              key="confirmPassword"
              label="Подтвердите пароль"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Повторите пароль"
              required
              disabled={loading}
            />
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Еще нет аккаунта?' : 'Уже есть аккаунт?'}
            <button
              onClick={switchMode}
              className="ml-2 text-[#5686fe] hover:text-[#4970fe] transition-colors font-medium"
              disabled={loading}
              type="button"
            >
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-[#38383a]">
          <p className="text-xs text-gray-500 text-center">
            Создано с любовью к технологиям и инновациям.
          </p>
        </div>
      </div>
    </div>
  );
}