import { useEffect, useRef } from 'react';
import { Message } from '../context/ChatContext';
import { useChat } from '../context/ChatContext';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import 'highlight.js/styles/github-dark.css';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-messages">
          <p>💬 No messages yet</p>
          <p className="empty-hint">Start a conversation by typing a message below</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
}
