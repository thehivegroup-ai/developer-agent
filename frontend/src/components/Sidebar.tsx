import { useState, useMemo, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import './Sidebar.css';

export default function Sidebar() {
  const { conversations, currentConversation, selectConversation, createConversation, messages } =
    useChat();
  const [showActions, setShowActions] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the menu and menu button
      if (
        showActions &&
        !target.closest('.conversation-actions') &&
        !target.closest('.conversation-menu-button')
      ) {
        setShowActions(null);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showActions]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title?.toLowerCase().includes(query) ||
        new Date(conv.createdAt).toLocaleDateString().includes(query)
    );
  }, [conversations, searchQuery]);

  const exportConversation = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const conversationMessages = currentConversation?.id === conversationId ? messages : []; // Would need to fetch if not current

    const exportData = {
      conversation,
      messages: conversationMessages,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowActions(null);
  };

  const exportAsMarkdown = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const conversationMessages = currentConversation?.id === conversationId ? messages : [];

    let markdown = `# ${conversation.title || 'Untitled Conversation'}\n\n`;
    markdown += `**Created:** ${new Date(conversation.createdAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    conversationMessages.forEach((msg) => {
      const role = msg.role === 'user' ? '**You**' : '**Agent**';
      const time = new Date(msg.createdAt).toLocaleTimeString();
      markdown += `### ${role} (${time})\n\n`;
      markdown += `${msg.content}\n\n`;
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.id}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowActions(null);
  };

  const deleteConversation = async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${conversation.title || 'this conversation'}"? This action cannot be undone.`
    );

    if (!confirmDelete) {
      setShowActions(null);
      return;
    }

    try {
      const response = await fetch(`/api/chat/conversation/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      // If we deleted the current conversation, create a new one
      if (currentConversation?.id === conversationId) {
        createConversation();
      }

      // Refresh conversations list (ChatContext will handle this via useEffect)
      window.location.reload(); // Simple approach - could be more elegant with proper state management
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }

    setShowActions(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>🤖 Developer Agent</h2>
        <button className="new-chat-button" onClick={() => createConversation()}>
          + New Chat
        </button>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="conversations-list">
        {filteredConversations.length === 0 && !searchQuery && (
          <div className="empty-state">
            <p>No conversations yet</p>
            <p className="empty-hint">Click "New Chat" to start</p>
          </div>
        )}

        {filteredConversations.length === 0 && searchQuery && (
          <div className="empty-state">
            <p>No matches found</p>
            <p className="empty-hint">Try a different search term</p>
          </div>
        )}

        {filteredConversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
          >
            <div className="conversation-main" onClick={() => selectConversation(conv.id)}>
              <div className="conversation-title">{conv.title || 'Untitled Conversation'}</div>
              <div className="conversation-date">
                {new Date(conv.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              className="conversation-menu-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(showActions === conv.id ? null : conv.id);
              }}
              title="More actions"
            >
              ⋮
            </button>
            {showActions === conv.id && (
              <div className="conversation-actions">
                <button onClick={() => exportConversation(conv.id)}>💾 Export JSON</button>
                <button onClick={() => exportAsMarkdown(conv.id)}>📝 Export Markdown</button>
                <button
                  onClick={() => deleteConversation(conv.id)}
                  className="delete-button"
                  title="Delete conversation"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
