'use client';

export const appConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002',
  ollamaUrl: process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:4001',
};