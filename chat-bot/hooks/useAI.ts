'use client';

import { useState, useCallback, useRef } from 'react';
import { appConfig } from './useConfig';

export const useAI = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  const sendMessageToAI = useCallback(async (message: string, chatHistory: any[] = []) => {
    setIsGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    try {
      const messagesForAI = [
        ...chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];
      const OLLAMA_URL = appConfig.ollamaUrl;
      
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'chat-bot',
          messages: messagesForAI,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при получении ответа от API');
      }
      return response.body;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Генерация остановлена пользователем');
        return null;
      }
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      throw err;
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsGenerating(false);
      }
    }
  }, []);

  const processStreamResponse = async (
    stream: ReadableStream<Uint8Array> | null,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError?: (error?: Error) => void,
    onStop?: (partialText: string) => void
  ) => {
    if (!stream) {
      onError?.(new Error('Поток не доступен'));
      return;
    }
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (abortControllerRef.current?.signal.aborted) {
          console.log('Останавливаем обработку потока');
          if (onStop && fullText) {
            onStop(fullText);
          }
          break;
        }
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              const content = data.message.content;
              fullText += content;
              onChunk(content);
            }
            if (data.done) {
              break;
            }
          } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
          }
        }
      }
      if (!abortControllerRef.current?.signal.aborted) {
        onComplete(fullText);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Поток прерван');
        if (onStop && fullText) {
          onStop(fullText);
        }
      } else {
        console.error('Ошибка обработки потока:', error);
        onError?.(error instanceof Error ? error : new Error('Ошибка обработки потока'));
      }
    } finally {
      reader.releaseLock();
      abortControllerRef.current = null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isGenerating,
    error,
    sendMessageToAI,
    processStreamResponse,
    stopGeneration,
    clearError,
  };
};