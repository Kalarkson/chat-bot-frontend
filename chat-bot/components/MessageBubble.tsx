import React, { useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { formatMessage } from '../utils/formatMessage';

interface MessageBubbleProps {
  message: {
    id: number;
    text: string;
    isUser: boolean;
    isGeneratingImage?: boolean;
    imageSrc?: string;
  };
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (message.isGeneratingImage) {
    return (
      <div className="w-full flex justify-start">
        <div className="max-w-full">
          <div className="bg-transparent text-gray-200">
            <div className="bg-[#1e1e20]/80 text-gray-300 px-5 py-3 rounded-2xl inline-flex items-center gap-3 backdrop-blur-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>{message.text || 'Генерирую изображение...'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let imageSrc = message.imageSrc;

  if (!imageSrc) {
    const imageMatch = message.text.match(/!\[Generated Image\]\((data:image\/png;base64,([^)]+))\)/);
    if (imageMatch && imageMatch[1]) {
      imageSrc = imageMatch[1];
    }
  }

  if (imageSrc) {
    return (
      <div className="w-full flex justify-start">
        <div className="max-w-full">
          <img
            src={imageSrc}
            alt="Сгенерированное изображение"
            className="rounded-xl max-w-full h-auto shadow-xl border border-[#38383a]/60"
          />
        </div>
      </div>
    );
  }

  const formattedText = formatMessage(message.text);

  return (
    <div className={`w-full ${message.isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`${message.isUser ? 'max-w-[83.333%]' : 'max-w-full'}`}>
        <div
          className={`${
            message.isUser
              ? 'bg-chat-input text-white p-2 rounded-2xl'
              : 'bg-transparent text-gray-200'
          }`}
        >
          <div
            className="text-sm mobile:text-base tablet:text-lg break-words"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        </div>
        <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mt-1`}>
          <button
            onClick={handleCopy}
            className="p-1 bg-transparent hover:ring-1 hover:ring-[#38383a] hover:bg-chat-input rounded-full transition-all duration-200 opacity-70 hover:opacity-100"
            title="Copy"
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#7e8286]" />
            ) : (
              <Copy className="w-4 h-4 text-[#7e8286]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;