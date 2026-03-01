'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import SideMenu from '../components/SideMenu';
import { Menu, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChats } from '../hooks/useChats';
import { useAI } from '../hooks/useAI';
import { UIMessage, ChatHistory, Message as ChatMessage } from '../types';
import { formatMessage } from '../utils/formatMessage';

interface ImageUIMessage extends UIMessage {
  imageBase64?: string;
  isGeneratingImage?: boolean;
}

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const {
    chats,
    currentChat,
    fetchUserChats,
    createNewChat,
    addMessageToChat,
    fetchChat,
    setCurrentChat,
    togglePinChat,
    deleteChat,
    loading: chatsLoading,
    error: chatsError,
    clearError: clearChatsError,
  } = useChats();

  const {
    isGenerating,
    error: aiError,
    isGeneratingImage,
    imageError,
    streamingChatId,
    imageGeneratingChatId,
    currentAIMessage,
    abortControllerRef,
    stopGeneration,
    handleImageGeneration,
    handleTextGeneration,
    clearError: clearAIError,
    clearImageError,
  } = useAI();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const uiMessages: ImageUIMessage[] = useMemo(() => {
    const messages: ImageUIMessage[] = [];

    if (currentChat?.messages) {
      currentChat.messages.forEach((msg: ChatMessage, index: number) => {
        if (msg.role === 'assistant' && msg.content?.startsWith('![Generated Image]')) {
          const match = msg.content.match(
            /!\[Generated Image\]\(data:image\/png;base64,([^)]+)\)/
          );
          if (match && match[1]) {
            messages.push({
              id: index,
              text: '',
              isUser: false,
              imageBase64: match[1],
            });
          } else {
            messages.push({
              id: index,
              text: formatMessage(msg.content),
              isUser: false,
            });
          }
        } else {
          messages.push({
            id: index,
            text: formatMessage(msg.content),
            isUser: msg.role === 'user',
          });
        }
      });
    }

    if (isClient && isGeneratingImage && imageGeneratingChatId === currentChat?.id) {
      messages.push({
        id: Date.now(),
        text: 'Генерирую изображение...',
        isUser: false,
        isGeneratingImage: true,
      });
    }

    return messages;
  }, [currentChat?.messages, isGeneratingImage, imageGeneratingChatId, isClient]);

  const chatHistory: ChatHistory[] = useMemo(() =>
    chats?.map(c => ({
      id: c.id,
      title: c.title,
      date: new Date(c.created_at).toLocaleDateString('ru-RU'),
      is_pinned: c.is_pinned,
      updated_at: c.updated_at
    })) || [],
    [chats]
  );

  const formattedCurrentAIMessage = useMemo(() => formatMessage(currentAIMessage), [currentAIMessage]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsMenuOpen(!mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (user) fetchUserChats();
  }, [user, fetchUserChats]);

  useEffect(() => {
    if (currentChat && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentChat?.id]);

  useEffect(() => {
    if ((isGenerating || isGeneratingImage) && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [isGenerating, isGeneratingImage]);

  const savePartialResponse = useCallback(async (chatId: string, partialText: string) => {
    if (partialText.trim()) {
      try {
        await addMessageToChat(chatId, 'assistant', partialText);
        await fetchChat(chatId);
        await fetchUserChats({ background: true });
      } catch (saveError) {
        console.error('Ошибка сохранения частичного ответа:', saveError);
      }
    }
  }, [addMessageToChat, fetchChat, fetchUserChats]);

const handleSendMessage = async (text: string) => {
  if (!user || isGenerating || isGeneratingImage) return;

  const trimmed = text.trim();
  const imageCommandMatch = trimmed.match(/^сгенерируй изображение:\s*(.+)$/i);

  let chatId: string | undefined = currentChat?.id;

  try {
    if (imageCommandMatch) {
    } else {
      if (!chatId) {
        chatId = await createNewChat(text);
        if (!chatId) {
          console.error('Не удалось создать чат');
          return;
        }
        await fetchChat(chatId);
      } else {
        await addMessageToChat(chatId, 'user', text);
        await fetchChat(chatId);
      }

      const updatedChat = await fetchChat(chatId);
      const messages = updatedChat?.messages || [];
      const currentChatId = chatId;

      let hasSaved = false;

      await handleTextGeneration(
        text,
        currentChatId,
        messages,
        (chunk) => {
          console.log('Получен чанк:', chunk);
        },
        async (completeText) => {
          if (!currentChatId || !completeText.trim() || hasSaved) return;
          
          hasSaved = true;
          await addMessageToChat(currentChatId, 'assistant', completeText);
          await fetchChat(currentChatId);
          await fetchUserChats({ background: true });
        },
        (error) => {
          console.error('Ошибка генерации текста:', error);
        },
        async (partialText) => {
          if (!currentChatId || !partialText.trim() || hasSaved) return;
          
          const wasAborted = abortControllerRef.current?.signal.aborted;
          if (wasAborted) {
            hasSaved = true;
            await addMessageToChat(currentChatId, 'assistant', partialText);
            await fetchChat(currentChatId);
            await fetchUserChats({ background: true });
          }
        }
      );
    }
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
  }
};

  const handleSelectChat = useCallback(async (chatId: string) => {
    await fetchChat(chatId);
  }, [fetchChat]);

  const handleNewChat = useCallback(() => {
    setCurrentChat(null);
  }, [setCurrentChat]);

  const handleTogglePin = useCallback(async (chatId: string, currentPinState: boolean) => {
    try {
      await togglePinChat(chatId, !currentPinState);
    } catch (error) {
      console.error('Ошибка при закреплении чата:', error);
    }
  }, [togglePinChat]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
      }
    } catch (error) {
      console.error('Ошибка при удалении чата:', error);
    }
  }, [deleteChat, currentChat?.id, setCurrentChat]);

  const clearAllErrors = useCallback(() => {
    clearChatsError();
    clearAIError();
    clearImageError();
  }, [clearChatsError, clearAIError, clearImageError]);

  const showCurrentAIMessage = currentAIMessage && streamingChatId === currentChat?.id;

  if (!isClient || authLoading) {
    return (
      <div className="min-h-screen bg-[#151517] flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (chatsError || aiError || imageError) {
    return (
      <div className="min-h-screen bg-[#151517] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Ошибка: {chatsError || aiError || imageError}</div>
          <button
            onClick={clearAllErrors}
            className="bg-[#5686fe] text-white px-4 py-2 rounded-lg hover:bg-[#4970fe]"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-[#151517] min-h-screen flex flex-col">
      <div className={`fixed top-4 left-4 z-50 flex space-x-2 transition-all duration-300 ${
        isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 bg-[#1e1e20] rounded-lg hover:bg-[#38383a] border border-[#38383a]"
        >
          <Menu className="w-5 h-5 text-gray-400" />
        </button>
        <button
          onClick={handleNewChat}
          className="p-2 bg-[#1e1e20] rounded-lg hover:bg-[#38383a] border border-[#38383a]"
          disabled={isGenerating || isGeneratingImage}
        >
          <Plus className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentChats={chatHistory}
        currentChatId={currentChat?.id}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onTogglePin={handleTogglePin}
        onDeleteChat={handleDeleteChat}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isMenuOpen && !isMobile ? 'md:ml-80' : ''}`}>
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col px-4">
          {isMobile && (
            <div className="pt-16 pb-4 text-center">
              <h1 className="text-xl font-bold text-white">AI Чат</h1>
              {currentChat && (
                <p className="text-gray-400 text-sm mt-1 truncate">
                  {currentChat.title}
                  {currentChat.is_pinned && ' 📌'}
                </p>
              )}
            </div>
          )}

          <div
            ref={messagesContainerRef}
            className={`flex-1 overflow-y-auto min-h-0 ${isMobile ? 'pb-24' : 'pt-4 pb-24'}`}
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-col gap-4 w-full">
              {uiMessages.length === 0 && !currentChat && !currentAIMessage && !isGeneratingImage && (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg">Начните диалог с AI</div>
                  <div className="text-gray-400 text-sm mt-2">
                      Для генерации изображения нужно написать <span className="font-mono bg-[#2a2a2c] px-1 rounded">сгенерируй изображение: [описание]</span>
                  </div>
                </div>
              )}

              {uiMessages.map((msg) => (
                <div key={msg.id} className="w-full">
                  {msg.imageBase64 ? (
                    <div className="flex justify-start">
                      <div className="max-w-full">
                        <img
                          src={`data:image/png;base64,${msg.imageBase64}`}
                          alt="Сгенерированное изображение"
                          className="rounded-xl max-w-full h-auto shadow-xl border border-[#38383a]/60"
                        />
                      </div>
                    </div>
                  ) : msg.isGeneratingImage ? (
                    <div className="flex justify-start">
                      <div className="bg-[#1e1e20]/80 text-gray-300 px-5 py-3 rounded-2xl inline-flex items-center gap-3 backdrop-blur-sm">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  ) : (
                    <MessageBubble message={msg} />
                  )}
                </div>
              ))}

              {showCurrentAIMessage && (
                <div className="w-full flex justify-start">
                  <div className="max-w-full">
                    <div className="bg-transparent text-gray-200 p-3 rounded-lg">
                      <div
                        className="text-gray-200 w-full text-sm mobile:text-base tablet:text-lg break-words whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formattedCurrentAIMessage }}
                      />
                      {isGenerating && <span className="ml-1 animate-pulse">|</span>}
                    </div>
                  </div>
                </div>
              )}

              {isGeneratingImage && imageGeneratingChatId && imageGeneratingChatId !== currentChat?.id && (
                <div className="w-full flex justify-center">
                  <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-3 rounded-lg text-sm">
                    Генерация изображения в другом чате...
                  </div>
                </div>
              )}

              {isGenerating && streamingChatId && streamingChatId !== currentChat?.id && (
                <div className="w-full flex justify-center">
                  <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-3 rounded-lg text-sm">
                    AI отвечает в другом чате...
                  </div>
                </div>
              )}

              <div className="h-8" />
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        onStopGeneration={stopGeneration}
        isMenuOpen={isMenuOpen && !isMobile}
        disabled={isGenerating || chatsLoading || isGeneratingImage}
        isGenerating={isGenerating || isGeneratingImage}
      />
    </main>
  );
}