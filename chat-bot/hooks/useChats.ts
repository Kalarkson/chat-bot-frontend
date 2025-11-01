'use client';

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { Chat, ChatDetail, Message, CreateChatRequest, AddMessageRequest } from '../types';

export const useChats = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const fetchUserChats = useCallback(async (options: { background?: boolean } = {}) => {
    const { background = false } = options;
    if (!user?.id) {
      setChats([]);
      return;
    }
    if (!background) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/user/${user.id}`);
      if (!response.ok) throw new Error('Ошибка загрузки чатов');
      const data = await response.json();
      setChats(data.chats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки чатов');
      setChats([]);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [user?.id, API_BASE_URL]);

  const createNewChat = async (firstMessage: string): Promise<string> => {
    if (!user?.id) throw new Error('Пользователь не авторизован');
    setLoading(true);
    setError(null);
    try {
      const requestData: CreateChatRequest = {
        user_id: user.id,
        message: firstMessage,
      };
      const response = await fetch(`${API_BASE_URL}/api/chats/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка создания чата: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      await fetchUserChats({ background: true });
      await fetchChat(data.chat.id);
      return data.chat.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка создания чата';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addMessageToChat = async (chatId: string, role: 'user' | 'assistant', content: string) => {
    setError(null);
    try {
      const requestData: AddMessageRequest = {
        chat_id: chatId,
        role,
        content,
      };
      const response = await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      if (!response.ok) throw new Error('Ошибка отправки сообщения');
      if (currentChat?.id === chatId) {
        await fetchChat(chatId);
      }
      await fetchUserChats({ background: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка отправки сообщения';
      setError(errorMessage);
      throw err;
    }
  };

  const fetchChat = async (chatId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`);
      if (!response.ok) throw new Error('Чат не найден');
      const data = await response.json();
      setCurrentChat(data.chat);
      return data.chat;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки чата';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка удаления чата');
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
      }
      await fetchUserChats({ background: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка удаления чата';
      setError(errorMessage);
      throw err;
    }
  };

  const togglePinChat = async (chatId: string, pin: boolean) => {
    setError(null);
    try {
      console.log('Toggle pin:', chatId, pin);
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_pinned: pin }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка обновления чата: ${response.status} - ${errorText}`);
      }
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? { ...chat, is_pinned: pin, updated_at: new Date().toISOString() }
            : chat
        )
      );
      if (currentChat?.id === chatId) {
        setCurrentChat(prev => prev ? { ...prev, is_pinned: pin } : null);
      }
      setTimeout(() => {
        fetchUserChats({ background: true });
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка обновления чата';
      setError(errorMessage);
      setTimeout(() => {
        fetchUserChats({ background: true });
      }, 100);
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    chats,
    currentChat,
    loading,
    error,
    fetchUserChats,
    createNewChat,
    addMessageToChat,
    fetchChat,
    deleteChat,
    togglePinChat,
    clearError,
    setCurrentChat,
  };
};