export interface User {
  id: string;
  username: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_pinned: boolean;
  last_message_at?: string;
}

export interface ChatDetail {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  last_message_at?: string;
  messages: Message[];
}

export interface ChatHistory {
  id: string;
  title: string;
  date: string;
  is_pinned: boolean;
  updated_at: string;
}

export interface CreateChatRequest {
  user_id: string;
  message: string;
}

export interface AddMessageRequest {
  chat_id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UIMessage {
  id: number;
  text: string;
  isUser: boolean;
}

export interface UIMessage {
  id: number;
  text: string;
  isUser: boolean;
}

export interface ImageUIMessage extends UIMessage {
  imageBase64?: string;
  isGeneratingImage?: boolean;
}