import { useState, KeyboardEvent } from 'react';
import { useChat } from '../context/ChatContext';
import { useWebSocket } from '../context/WebSocketContext';
import './MessageInput.css';

export default function MessageInput() {
  const [input, setInput] = useState('');
  const { sendMessage, isLoading } = useChat();
  const { clearActivities } = useWebSocket();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    // Clear agent activities from previous message
    clearActivities();

    await sendMessage(message);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-container">
      <textarea
        className="message-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message... (Shift+Enter for new line)"
        rows={3}
        disabled={isLoading}
      />
      <button className="send-button" onClick={handleSend} disabled={!input.trim() || isLoading}>
        {isLoading ? '⏳' : '📤'} Send
      </button>
    </div>
  );
}
