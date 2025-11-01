'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ChatInput from '../components/ChatInput';
import MessageBubble from '../components/MessageBubble';
import SideMenu from '../components/SideMenu';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChats } from '../hooks/useChats';
import { useAI } from '../hooks/useAI';
import { UIMessage, ChatHistory } from '../types';
import { formatMessage } from '../utils/formatMessage';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentAIMessage, setCurrentAIMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [streamingChatId, setStreamingChatId] = useState<string | null>(null);

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
    sendMessageToAI,
    processStreamResponse,
    stopGeneration,
    clearError: clearAIError,
  } = useAI();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const uiMessages: UIMessage[] = useMemo(() =>
    currentChat?.messages?.map((msg, index) => ({
      id: index,
      text: formatMessage(msg.content),
      isUser: msg.role === 'user',
    })) || [],
    [currentChat?.messages]
  );

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
    if (isStreaming && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && currentAIMessage === '' && streamingChatId === currentChat?.id) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isStreaming, currentAIMessage, currentChat?.id]);

  const handleStopGeneration = useCallback(() => {
    stopGeneration();
    setIsStreaming(false);
    setStreamingChatId(null);
  }, [stopGeneration]);

  const savePartialResponse = useCallback(async (chatId: string, partialText: string) => {
    if (partialText.trim()) {
      try {
        await addMessageToChat(chatId, 'assistant', partialText);
        await fetchChat(chatId);
        await fetchUserChats({ background: true });
      } catch (saveError) {
      }
    }
  }, [addMessageToChat, fetchChat, fetchUserChats]);

  const handleAIMessage = async (text: string, chatId: string) => {
    if (!user || isGenerating || isStreaming) return;
    try {
      setIsStreaming(true);
      setCurrentAIMessage('');
      setStreamingChatId(chatId);
      const currentMessages = currentChat?.messages || [];
      const stream = await sendMessageToAI(text, currentMessages);
      if (!stream) {
        setIsStreaming(false);
        setCurrentAIMessage('');
        setStreamingChatId(null);
        return;
      }
      let fullText = '';
      let hasSaved = false;
      await processStreamResponse(
        stream,
        (chunk) => {
          fullText += chunk;
          setCurrentAIMessage(fullText);
        },
        async (completeText) => {
          if (completeText.trim() && !hasSaved) {
            await addMessageToChat(chatId, 'assistant', completeText);
            await fetchChat(chatId);
            await fetchUserChats({ background: true });
            hasSaved = true;
          }
          setCurrentAIMessage('');
          setIsStreaming(false);
          setStreamingChatId(null);
        },
        async (error) => {
          if (fullText.trim() && !hasSaved) {
            await savePartialResponse(chatId, fullText);
            hasSaved = true;
          }
          setIsStreaming(false);
          setCurrentAIMessage('');
          setStreamingChatId(null);
        },
        async (partialText) => {
          if (partialText.trim() && !hasSaved) {
            await savePartialResponse(chatId, partialText);
            hasSaved = true;
          }
          setCurrentAIMessage('');
          setIsStreaming(false);
          setStreamingChatId(null);
        }
      );
    } catch (error) {
      setIsStreaming(false);
      setCurrentAIMessage('');
      setStreamingChatId(null);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user || isGenerating || isStreaming) return;
    let chatId = currentChat?.id;
    try {
      if (!chatId) {
        chatId = await createNewChat(text);
        await fetchChat(chatId);
        await fetchUserChats({ background: true });
      } else {
        await addMessageToChat(chatId, 'user', text);
        await fetchChat(chatId);
        await fetchUserChats({ background: true });
      }
      await handleAIMessage(text, chatId);
    } catch (error) {
    }
  };

  const handleSelectChat = useCallback(async (chatId: string) => {
    await fetchChat(chatId);
    setCurrentAIMessage('');
  }, [fetchChat]);

  const handleNewChat = useCallback(() => {
    setCurrentChat(null);
    setCurrentAIMessage('');
  }, [setCurrentChat]);

  const handleTogglePin = useCallback(async (chatId: string, currentPinState: boolean) => {
    try {
      const newPinState = !currentPinState;
      await togglePinChat(chatId, newPinState);
    } catch (error) {
    }
  }, [togglePinChat]);

  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      await deleteChat(chatId);
      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setCurrentAIMessage('');
      }
    } catch (error) {
    }
  }, [deleteChat, currentChat?.id, setCurrentChat]);

  const clearAllErrors = useCallback(() => {
    clearChatsError();
    clearAIError();
  }, [clearChatsError, clearAIError]);

  const showCurrentAIMessage = currentAIMessage && streamingChatId === currentChat?.id;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#151517] flex items-center justify-center">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (chatsError || aiError) {
    return (
      <div className="min-h-screen bg-[#151517] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Ошибка: {chatsError || aiError}</div>
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
          disabled={isGenerating || isStreaming}
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
              {isStreaming && streamingChatId !== currentChat?.id && (
                <p className="text-blue-400 text-sm mt-1">AI генерирует...</p>
              )}
            </div>
          )}

          <div
            ref={messagesContainerRef}
            className={`flex-1 overflow-y-auto min-h-0 ${isMobile ? 'pb-24' : 'pt-4 pb-24'}`}
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="flex flex-col gap-4 w-full">
              {uiMessages.length === 0 && !currentChat && !currentAIMessage && (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg">Начните новый диалог с AI</div>
                  <div className="text-gray-400 text-sm mt-2">Задайте любой вопрос в поле ниже</div>
                </div>
              )}
              {uiMessages.map(m => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {showCurrentAIMessage && (
                <div className="w-full flex justify-start">
                  <div className="max-w-full">
                    <div className="bg-transparent text-gray-200 p-3 rounded-lg">
                      <div
                        className="text-gray-200 w-full text-sm mobile:text-base tablet:text-lg break-words whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formattedCurrentAIMessage }}
                      />
                      {isStreaming && <span className="ml-1 animate-pulse">|</span>}
                    </div>
                  </div>
                </div>
              )}
              {isStreaming && streamingChatId !== currentChat?.id && !isMobile && (
                <div className="w-full flex justify-center">
                  <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-3 rounded-lg text-sm">
                    AI генерирует ответ в другом чате...
                  </div>
                </div>
              )}
              {(aiError || chatsError) && (
                <div className="w-full flex justify-start">
                  <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-sm">
                    {aiError || chatsError}
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
        onStopGeneration={handleStopGeneration}
        isMenuOpen={isMenuOpen && !isMobile}
        disabled={isGenerating || chatsLoading}
        isGenerating={isStreaming}
      />
    </main>
  );
}