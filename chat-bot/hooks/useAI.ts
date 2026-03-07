'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
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
  const abortImageControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (abortImageControllerRef.current) abortImageControllerRef.current.abort();
      setIsGenerating(false);
      setIsGeneratingImage(false);
      setStreamingChatId(null);
      setImageGeneratingChatId(null);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamingChatId(null);
    setCurrentAIMessage('');
  }, []);

  const stopImageGeneration = useCallback(() => {
    if (abortImageControllerRef.current) {
      abortImageControllerRef.current.abort();
      abortImageControllerRef.current = null;
    }
    setIsGeneratingImage(false);
    setImageGeneratingChatId(null);
    const COMFYUI_URL = appConfig.comfyuiUrl;
    fetch(`${COMFYUI_URL}/interrupt`, { method: 'POST', mode: 'cors' }).catch(() => {});
  }, []);

  const translateWithLibre = useCallback(async (text: string): Promise<string> => {
    if (!/[а-яА-Я]/.test(text)) return text;
    try {
      const instances = [
        'https://libretranslate.com',
        'https://translate.argosopentech.com',
        'https://libretranslate.de',
        'https://translate.fedilab.app',
      ];
      let translated = text;
      for (const baseUrl of instances) {
        try {
          const response = await fetch(`${baseUrl}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text, source: 'ru', target: 'en', format: 'text' }),
          });
          if (!response.ok) continue;
          const data = await response.json();
          translated = data.translatedText || text;
          return translated;
        } catch {}
      }
      return text;
    } catch {
      return text;
    }
  }, []);

  const generateImage = useCallback(async (prompt: string): Promise<string | null> => {
    setIsGeneratingImage(true);
    setImageError(null);
    abortImageControllerRef.current = new AbortController();
    try {
      const COMFYUI_URL = appConfig.comfyuiUrl;
      const checkResponse = await fetch(`${COMFYUI_URL}/system_stats`, {
        method: 'GET',
        mode: 'cors',
        signal: abortImageControllerRef.current.signal,
      });
      if (!checkResponse.ok) throw new Error('ComfyUI сервер не отвечает');
      const workflow = {
        "3": {
          "inputs": {
            "seed": Math.floor(Math.random() * 1000000),
            "steps": 10,
            "cfg": 4,
            "sampler_name": "res_multistep",
            "scheduler": "simple",
            "denoise": 1,
            "model": ["11", 0],
            "positive": ["26:7", 0],
            "negative": ["25:7", 0],
            "latent_image": ["13", 0]
          },
          "class_type": "KSampler",
          "_meta": { "title": "KSampler" }
        },
        "4": {
          "inputs": { "ckpt_name": "NetaYumev35_pretrained_all_in_one.safetensors" },
          "class_type": "CheckpointLoaderSimple",
          "_meta": { "title": "Загрузить сheckpoint" }
        },
        "8": {
          "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
          "class_type": "VAEDecode",
          "_meta": { "title": "Декодировать VAE" }
        },
        "9": {
          "inputs": { "filename_prefix": `NetaYume_${Date.now()}`, "images": ["8", 0] },
          "class_type": "SaveImage",
          "_meta": { "title": "Сохранить изображение" }
        },
        "11": {
          "inputs": { "shift": 4, "model": ["4", 0] },
          "class_type": "ModelSamplingAuraFlow",
          "_meta": { "title": "Выборка модели AuraFlow" }
        },
        "13": {
          "inputs": { "width": 512, "height": 512, "batch_size": 1 },
          "class_type": "EmptySD3LatentImage",
          "_meta": { "title": "Пустой SD3LatentImage" }
        },
        "25:22": {
          "inputs": { "string_a": ["25:23", 0], "string_b": ["25:24", 0], "delimiter": "" },
          "class_type": "StringConcatenate",
          "_meta": { "title": "Объединить" }
        },
        "25:23": {
          "inputs": { "value": "You are an assistant designed to generate low-quality images based on textual prompts <Prompt Start> " },
          "class_type": "PrimitiveStringMultiline",
          "_meta": { "title": "System prompt" }
        },
        "25:24": {
          "inputs": { "value": "blurry, worst quality, low quality, jpeg artifacts, signature, watermark, username, error, deformed hands, bad anatomy, extra limbs, poorly drawn hands, poorly drawn face, mutation, deformed, extra eyes, extra arms, extra legs, malformed limbs, fused fingers, too many fingers, long neck, cross-eyed, bad proportions, missing arms, missing legs, extra digit, fewer digits, cropped" },
          "class_type": "PrimitiveStringMultiline",
          "_meta": { "title": "System prompt" }
        },
        "25:7": {
          "inputs": { "text": ["25:22", 0], "clip": ["4", 1] },
          "class_type": "CLIPTextEncode",
          "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
        },
        "26:23": {
          "inputs": { "value": "You are an assistant designed to generate high quality anime images based on textual prompts. <Prompt Start> " },
          "class_type": "PrimitiveStringMultiline",
          "_meta": { "title": "System prompt" }
        },
        "26:24": {
          "inputs": { "value": prompt },
          "class_type": "PrimitiveStringMultiline",
          "_meta": { "title": "Prompt" }
        },
        "26:22": {
          "inputs": { "string_a": ["26:23", 0], "string_b": ["26:24", 0], "delimiter": "" },
          "class_type": "StringConcatenate",
          "_meta": { "title": "Объединить" }
        },
        "26:7": {
          "inputs": { "text": ["26:22", 0], "clip": ["4", 1] },
          "class_type": "CLIPTextEncode",
          "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
        }
      };
      const response = await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: workflow }),
        signal: abortImageControllerRef.current.signal,
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`ComfyUI error: ${response.status} - ${errText}`);
      }
      const data = await response.json();
      const promptId = data.prompt_id;
      let attempts = 0;
      const maxAttempts = 600;
      const pollInterval = 1000;
      while (attempts < maxAttempts) {
        if (abortImageControllerRef.current?.signal.aborted) throw new Error('Генерация прервана');
        attempts++;
        const historyRes = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
          mode: 'cors',
          signal: abortImageControllerRef.current.signal,
        });
        if (historyRes.ok) {
          const history = await historyRes.json();
          if (history[promptId]?.outputs?.["9"]?.images?.length > 0) {
            const imageInfo = history[promptId].outputs["9"].images[0];
            const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(imageInfo.filename)}&type=${imageInfo.type}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}`;
            const testRes = await fetch(imageUrl, { method: 'HEAD', mode: 'cors' });
            if (!testRes.ok) throw new Error(`Изображение недоступно: ${testRes.status}`);
            return imageUrl;
          }
        }
        await new Promise(r => setTimeout(r, pollInterval));
      }
      throw new Error(`Таймаут (${maxAttempts} сек)`);
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      setImageError(err.message || 'Ошибка генерации');
      return null;
    } finally {
      setIsGeneratingImage(false);
      abortImageControllerRef.current = null;
    }
  }, []);

  const sendMessageToAI = useCallback(async (message: string, chatHistory: any[] = []) => {
    setIsGenerating(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    try {
      const messagesForAI = [
        ...chatHistory.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: message }
      ];
      const OLLAMA_URL = appConfig.ollamaUrl;
      const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'chat-bot:latest',
          messages: messagesForAI,
          stream: true,
          options: { thinking: true }
        }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка API');
      }
      return response.body;
    } catch (err: any) {
      if (err.name === 'AbortError') return null;
      setError(err.message || 'Неизвестная ошибка');
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
      onError?.(new Error('Поток недоступен'));
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
          if (onStop && fullText) onStop(fullText);
          setIsGenerating(false);
          break;
        }
        if (done) {
          if (!abortControllerRef.current?.signal.aborted) onComplete(fullText);
          setIsGenerating(false);
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              const content = data.message.content;
              fullText += content;
              onChunk(content);
            }
            if (data.done) {
              if (!abortControllerRef.current?.signal.aborted) onComplete(fullText);
              setIsGenerating(false);
              reader.cancel();
              break;
            }
          } catch {}
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (onStop && fullText) onStop(fullText);
      } else {
        onError?.(error);
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
    onSuccess?: (msg: string) => void,
    onError?: (msg: string) => void
  ) => {
    setImageGeneratingChatId(chatId);
    let finalPrompt = prompt;
    if (/[а-яА-Я]/.test(prompt)) {
      try {
        finalPrompt = await translateWithLibre(prompt);
      } catch {}
    }
    try {
      const imageUrl = await generateImage(finalPrompt);
      if (imageUrl) {
        const msg = `![Generated Image](${imageUrl})`;
        onSuccess?.(msg);
      } else {
        onError?.('Не удалось получить изображение');
      }
    } catch (err) {
      onError?.('Ошибка генерации изображения');
    } finally {
      setImageGeneratingChatId(null);
    }
  }, [generateImage, translateWithLibre]);

  const handleTextGeneration = useCallback(async (
    text: string,
    chatId: string,
    chatHistory: any[],
    onChunk: (chunk: string) => void,
    onComplete: (full: string) => void,
    onError?: (err?: Error) => void,
    onStop?: (partial: string) => void
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
        chunk => {
          fullText += chunk;
          setCurrentAIMessage(fullText);
          onChunk(chunk);
        },
        complete => {
          onComplete(complete);
          setStreamingChatId(null);
          setCurrentAIMessage('');
        },
        err => {
          onError?.(err);
          setStreamingChatId(null);
          setCurrentAIMessage('');
        },
        partial => {
          onStop?.(partial);
          setStreamingChatId(null);
          setCurrentAIMessage('');
        }
      );
    } catch (err) {
      setStreamingChatId(null);
      setCurrentAIMessage('');
      setIsGenerating(false);
    }
  }, [sendMessageToAI, processStreamResponse]);

  const clearError = () => setError(null);
  const clearImageError = () => setImageError(null);

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
    stopImageGeneration
  };
};