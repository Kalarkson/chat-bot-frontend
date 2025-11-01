import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { formatMessage } from '../utils/formatMessage';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

const MessageBubble = ({ message }: { message: Message }) => {
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