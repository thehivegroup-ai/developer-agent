import { useChat } from '../context/ChatContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import AgentActivity from './AgentActivity';
import './ChatInterface.css';

export default function ChatInterface() {
  const { currentConversation, messages, isLoading } = useChat();

  if (!currentConversation) {
    return (
      <div className="chat-interface">
        <div className="no-conversation">
          <div className="no-conversation-content">
            <h2>👋 Welcome to Developer Agent</h2>
            <p>Select a conversation from the sidebar or create a new one to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>{currentConversation.title || 'Untitled Conversation'}</h3>
        {isLoading && <span className="loading-indicator">⏳ Loading...</span>}
      </div>

      <div className="chat-main">
        <div className="chat-messages">
          <MessageList messages={messages} />
          <MessageInput />
        </div>

        <div className="chat-activity">
          <AgentActivity />
        </div>
      </div>
    </div>
  );
}
