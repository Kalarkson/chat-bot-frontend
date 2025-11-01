'use client';

import React, { useMemo, memo, useState } from 'react';
import { ChevronLeft, LogOut, MessageSquare, Plus, X, Pin, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ChatHistory } from '../types';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentChats?: ChatHistory[];
  currentChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onTogglePin: (chatId: string, pin: boolean) => void;
  onDeleteChat: (chatId: string) => void;
}

const groupChatsByDate = (chats: ChatHistory[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const groups: { [key: string]: ChatHistory[] } = {
    pinned: [],
    today: [],
    yesterday: [],
    lastWeek: [],
    older: []
  };
  const sortedChats = [...chats].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  sortedChats.forEach(chat => {
    const chatDate = new Date(chat.updated_at);
    if (chat.is_pinned) {
      groups.pinned.push(chat);
    } else if (chatDate >= today) {
      groups.today.push(chat);
    } else if (chatDate >= yesterday) {
      groups.yesterday.push(chat);
    } else if (chatDate >= lastWeek) {
      groups.lastWeek.push(chat);
    } else {
      groups.older.push(chat);
    }
  });
  return groups;
};

const ChatItem = memo(({
  chat,
  isActive,
  onSelect,
  onTogglePin,
  onDelete
}: {
  chat: ChatHistory;
  isActive: boolean;
  onSelect: (chatId: string) => void;
  onTogglePin: (chatId: string, isPinned: boolean) => void;
  onDelete: (chatId: string) => void;
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleClick = () => {
    if (!showDeleteConfirm) {
      onSelect(chat.id);
    }
  };
  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onTogglePin(chat.id, chat.is_pinned);
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDeleteConfirm(true);
  };
  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(chat.id);
    setShowDeleteConfirm(false);
  };
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowDeleteConfirm(false);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`w-full text-left p-3 rounded-lg transition-colors duration-200 group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5686fe] ${
        isActive
          ? 'bg-[#5686fe] bg-opacity-20 border border-[#5686fe] border-opacity-50'
          : 'hover:bg-[#38383a] border border-transparent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {chat.is_pinned && (
              <Pin className={`w-3 h-3 flex-shrink-0 ${
                isActive ? 'text-white fill-white' : 'text-[#5686fe] fill-[#5686fe]'
              }`} />
            )}
            <span className={`text-sm font-medium truncate ${
              isActive ? 'text-white' : 'text-white group-hover:text-[#5686fe]'
            }`}>
              {chat.title || 'Новый чат'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={handlePinClick}
            className={`p-1 rounded transition-all duration-200 flex-shrink-0 ${
              isActive
                ? 'opacity-100 hover:bg-white hover:bg-opacity-20'
                : 'opacity-0 group-hover:opacity-100 hover:bg-[#5686fe] hover:bg-opacity-20'
            }`}
            title={chat.is_pinned ? 'Открепить' : 'Закрепить'}
          >
            <Pin
              className={`w-3 h-3 ${
                chat.is_pinned
                  ? isActive ? 'text-white fill-white' : 'text-[#5686fe] fill-[#5686fe]'
                  : 'text-gray-400'
              }`}
            />
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={handleDeleteClick}
              className={`p-1 rounded transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? 'opacity-100 hover:bg-white hover:bg-opacity-20'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:bg-opacity-20'
              }`}
              title="Удалить чат"
            >
              <Trash2 className={`w-3 h-3 ${
                isActive ? 'text-white' : 'text-gray-400'
              }`} />
            </button>
          ) : (
            <div className="flex items-center space-x-1 bg-red-500 bg-opacity-20 rounded p-1">
              <button
                onClick={handleConfirmDelete}
                className="p-1 hover:bg-red-500 hover:bg-opacity-30 rounded transition-colors"
                title="Подтвердить удаление"
              >
                <span className="text-xs text-white font-bold">✓</span>
              </button>
              <button
                onClick={handleCancelDelete}
                className="p-1 hover:bg-gray-500 hover:bg-opacity-30 rounded transition-colors"
                title="Отменить удаление"
              >
                <span className="text-xs text-white font-bold">✕</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-red-500 text-white text-xs p-2 rounded-lg z-10">
          Удалить чат?
        </div>
      )}
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

const ChatGroup = memo(({
  title,
  chats,
  currentChatId,
  onSelectChat,
  onTogglePin,
  onDeleteChat
}: {
  title: string;
  chats: ChatHistory[];
  currentChatId?: string | null;
  onSelectChat: (chatId: string) => void;
  onTogglePin: (chatId: string, pin: boolean) => void;
  onDeleteChat: (chatId: string) => void;
}) => {
  if (chats.length === 0) return null;
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
        {title}
      </h3>
      <div className="space-y-2">
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === currentChatId}
            onSelect={onSelectChat}
            onTogglePin={onTogglePin}
            onDelete={onDeleteChat}
          />
        ))}
      </div>
    </div>
  );
});

ChatGroup.displayName = 'ChatGroup';

const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  currentChats = [],
  currentChatId,
  onSelectChat,
  onNewChat,
  onTogglePin,
  onDeleteChat
}) => {
  const { user, logout } = useAuth();
  const groupedChats = useMemo(() => groupChatsByDate(currentChats), [currentChats]);
  const handleExit = () => {
    logout();
  };
  const handleNewChat = () => {
    onNewChat();
    if (window.innerWidth < 768) {
      onClose();
    }
  };
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed top-0 left-0 h-full w-full md:w-80 bg-[#1e1e20] z-40 border-r border-[#38383a] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'
        }`}
      >
        <div className="flex-shrink-0 p-4 border-b border-[#38383a]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-white font-semibold text-base">
                Привет, {user?.username}!
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#38383a] rounded-lg transition-colors duration-200 md:hidden"
                title="Закрыть меню"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#38383a] rounded-lg transition-colors duration-200 hidden md:block"
                title="Закрыть меню"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-1.5 py-3 px-4 rounded-md bg-[#5686fe] bg-opacity-10 text-[#5686fe] hover:bg-[#5686fe] hover:bg-opacity-20 transition-all duration-200 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Новый чат</span>
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-shrink-0 p-4">
            <h2 className="text-white font-semibold text-lg flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-[#5686fe]" />
              История чатов
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <ChatGroup
              title="Закрепленные"
              chats={groupedChats.pinned}
              currentChatId={currentChatId}
              onSelectChat={onSelectChat}
              onTogglePin={onTogglePin}
              onDeleteChat={onDeleteChat}
            />
            <ChatGroup
              title="Сегодня"
              chats={groupedChats.today}
              currentChatId={currentChatId}
              onSelectChat={onSelectChat}
              onTogglePin={onTogglePin}
              onDeleteChat={onDeleteChat}
            />
            <ChatGroup
              title="Вчера"
              chats={groupedChats.yesterday}
              currentChatId={currentChatId}
              onSelectChat={onSelectChat}
              onTogglePin={onTogglePin}
              onDeleteChat={onDeleteChat}
            />
            <ChatGroup
              title="На этой неделе"
              chats={groupedChats.lastWeek}
              currentChatId={currentChatId}
              onSelectChat={onSelectChat}
              onTogglePin={onTogglePin}
              onDeleteChat={onDeleteChat}
            />
            <ChatGroup
              title="Ранее"
              chats={groupedChats.older}
              currentChatId={currentChatId}
              onSelectChat={onSelectChat}
              onTogglePin={onTogglePin}
              onDeleteChat={onDeleteChat}
            />
            {currentChats.length === 0 && (
              <div className="text-center py-8">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-base">История пуста</p>
                <p className="text-gray-400 text-sm mt-1">Создайте первый чат!</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 border-t border-[#38383a] p-4">
          <button
            onClick={handleExit}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg bg-red-500 bg-opacity-10 text-red-400 hover:bg-red-500 hover:bg-opacity-20 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-base">Выйти</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SideMenu;