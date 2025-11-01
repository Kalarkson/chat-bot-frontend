'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGeneration?: () => void;
  isMenuOpen: boolean;
  disabled?: boolean;
  isGenerating?: boolean;
}

const ChatInput = ({
  onSendMessage,
  onStopGeneration,
  isMenuOpen,
  disabled = false,
  isGenerating = false
}: ChatInputProps) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled && !isGenerating) {
      onSendMessage(input);
      setInput('');
    }
  };
  const handleStopGeneration = () => {
    if (onStopGeneration) {
      onStopGeneration();
    }
  };
  useEffect(() => {
    if (textareaRef.current) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      const singleLineHeight = 24;
      const maxHeight = 8 * 24;
      const scrollHeight = el.scrollHeight;
      if (input === '') {
        el.style.height = `${singleLineHeight}px`;
        el.style.overflow = 'hidden';
      } else if (scrollHeight <= maxHeight) {
        el.style.height = `${scrollHeight}px`;
        el.style.overflow = 'hidden';
      } else {
        el.style.height = `${maxHeight}px`;
        el.style.overflow = 'auto';
      }
    }
  }, [input]);
  const isSendDisabled = !input.trim() || disabled || isGenerating;
  return (
    <div className={`fixed bottom-0 left-0 right-0 transition-all duration-300 ${
      isMenuOpen ? 'md:left-72' : 'left-0'
    }`}>
      <div className="max-w-3xl mx-auto px-4 pb-3">
        <form
          onSubmit={handleSubmit}
          className="w-full bg-chat-input rounded-2xl ring-1 ring-[#38383a] p-3"
        >
          <div className="flex flex-col w-full">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`bg-chat-input text-white placeholder-gray-400
                       rounded-xl outline-none ring-0
                       text-sm mobile:text-base tablet:text-lg
                       w-full
                       transition-all duration-200
                       border-none resize-none leading-6
                       focus:ring-0 focus:outline-none focus:border-none
                       scrollbar-thin
                       overflow-auto
                       ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder={isGenerating ? "AI генерирует ответ..." : "Задайте вопрос AI..."}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isSendDisabled) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={disabled || isGenerating}
            />
            <div className="flex justify-end mt-2">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="bg-red-500 text-white rounded-3xl ring-1 hover:bg-red-600 hover:ring-red-400
                            transition-colors duration-200
                            flex items-center justify-center
                            w-8 h-8"
                >
                  <Square className="w-4 h-4" color="#ffffff" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={`bg-[#5686fe] text-white rounded-3xl ring-1 hover:bg-[#4970fe] hover:ring-[#3964fe]
                            transition-colors duration-200
                            flex items-center justify-center
                            w-8 h-8
                            ${isSendDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSendDisabled}
                >
                  <ArrowUp className="w-5 h-5" color="#eff0f1" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;