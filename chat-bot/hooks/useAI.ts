'use client';

import { useState, useCallback, useRef } from 'react';
import { appConfig } from './useConfig';

export const useAI = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);
  const [imageGeneratingChatId, setImageGeneratingChatId] = useState<string | null>(null);
  const [currentAIMessage, setCurrentAIMessage] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamingChatId(null);
    setCurrentAIMessage('');
  }, []);

  const translateWithLibre = useCallback(async (text: string): Promise<string> => {
    if (!/[а-яА-Я]/.test(text)) {
      return text;
    }

    try {
      console.log("→ Перевод текста:", text);
      
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'ru',
          target: 'en',
          format: 'text'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LibreTranslate ошибка ${response.status}:`, errorText);
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("← Перевод готов:", data.translatedText);
      return data.translatedText || text;
    } catch (error) {
      console.error('Ошибка перевода через LibreTranslate:', error);
      return text;
    }
  }, []);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      console.log("→ Запрос генерации изображения");
      console.log("Prompt:", prompt);
      
      const STABLE_URL = appConfig.stableUrl;

      const response = await fetch(`${STABLE_URL}/sdapi/v1/txt2img`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          negative_prompt: 'worst quality, low quality',
          steps: 15,
          width: 320,
          height: 320,
          cfg_scale: 6.0,
          sampler_index: 'Euler',
          seed: -1,
          batch_size: 1,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Stable Diffusion вернул ошибку:", response.status, errText);
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();

      if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
        console.error("В ответе нет изображений:", data);
        throw new Error("Пустой массив images");
      }

      const base64 = data.images[0];
      console.log("← Получено изображение, длина base64:", base64?.length ?? "NULL");
      return base64;
    } catch (error) {
      console.error('Ошибка генерации изображения:', error);
      setImageError(error instanceof Error ? error.message : 'Ошибка генерации изображения');
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
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
          model: 'chat-bot:latest',
          messages: messagesForAI,
          stream: true,
          options: {
            thinking: true,
          }
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
      setIsGenerating(false);
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
          setIsGenerating(false);
          break;
        }
        
        if (done) {
          if (!abortControllerRef.current?.signal.aborted) {
            onComplete(fullText);
          }
          setIsGenerating(false);
          break;
        }
        
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
              if (!abortControllerRef.current?.signal.aborted) {
                onComplete(fullText);
              }
              setIsGenerating(false);
              reader.cancel();
              break;
            }
          } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
          }
        }
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
      setIsGenerating(false);
    } finally {
      reader.releaseLock();
      abortControllerRef.current = null;
    }
  };

  const handleImageGeneration = useCallback(async (
    prompt: string,
    chatId: string,
    onSuccess?: (imageMessage: string) => void,
    onError?: (errorMessage: string) => void
  ) => {
    setImageGeneratingChatId(chatId);

    const hasCyrillic = /[а-яА-Я]/.test(prompt);
    let finalPrompt = prompt;

    if (hasCyrillic) {
      try {
        finalPrompt = await translateWithLibre(prompt);
      } catch (error) {
        console.error('Ошибка перевода:', error);
      }
    }

    try {
      const imageBase64 = await generateImage(finalPrompt);

      if (imageBase64 && imageBase64.length > 100) {
        const imageMessage = `![Generated Image](data:image/png;base64,${imageBase64})`;
        onSuccess?.(imageMessage);
      } else {
        onError?.('Не удалось сгенерировать изображение\nПроверьте, запущен ли Stable Diffusion (порт 7860)');
      }
    } catch (error) {
      console.error('Ошибка в handleImageGeneration:', error);
      onError?.('Произошла ошибка при генерации изображения');
    } finally {
      setImageGeneratingChatId(null);
    }
  }, [generateImage, translateWithLibre]);

  const handleTextGeneration = useCallback(async (
    text: string,
    chatId: string,
    chatHistory: any[],
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError?: (error?: Error) => void,
    onStop?: (partialText: string) => void
  ) => {
    setStreamingChatId(chatId);
    setCurrentAIMessage('');
    
    try {
      const stream = await sendMessageToAI(text, chatHistory);
      if (!stream) {
        setStreamingChatId(null);
        setIsGenerating(false);
        return;
      }

      let fullText = '';
      await processStreamResponse(
        stream,
        (chunk) => {
          fullText += chunk;
          setCurrentAIMessage(fullText);
          onChunk(chunk);
        },
        (completeText) => {
          onComplete(completeText);
          setStreamingChatId(null);
          setCurrentAIMessage('');
        },
        (error) => {
          onError?.(error);
          setStreamingChatId(null);
          setCurrentAIMessage('');
        },
        (partialText) => {
          onStop?.(partialText);
          setStreamingChatId(null);
          setCurrentAIMessage('');
        }
      );
    } catch (error) {
      console.error('Ошибка в handleTextGeneration:', error);
      setStreamingChatId(null);
      setCurrentAIMessage('');
      setIsGenerating(false);
    }
  }, [sendMessageToAI, processStreamResponse]);

  const clearError = () => {
    setError(null);
  };

  const clearImageError = () => {
    setImageError(null);
  };

  return {
    isGenerating,
    error,
    isGeneratingImage,
    imageError,
    streamingChatId,
    imageGeneratingChatId,
    currentAIMessage,
    abortControllerRef,
    
    setIsGeneratingImage,
    
    stopGeneration,
    generateImage,
    sendMessageToAI,
    processStreamResponse,
    handleImageGeneration,
    handleTextGeneration,
    translateWithLibre,
    clearError,
    clearImageError,
  };
};