import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Message } from '../context/ChatContext';
import './MessageItem.css';

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyCodeBlock = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
      <div className="message-header">
        <span className="message-role">{message.role === 'user' ? '👤 You' : '🤖 Agent'}</span>
        {message.agentType && <span className="agent-type-badge">{message.agentType}</span>}
        <span className="message-timestamp">
          {new Date(message.createdAt).toLocaleTimeString()}
        </span>
      </div>
      <div className="message-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const inline = !match;
              const codeString = String(children).replace(/\n$/, '');

              if (inline) {
                return (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              }

              return (
                <div className="code-block-wrapper">
                  <div className="code-block-header">
                    <span className="code-language">{match ? match[1] : 'text'}</span>
                    <button
                      className="copy-code-button"
                      onClick={() => copyCodeBlock(codeString)}
                      title="Copy code"
                    >
                      📋 Copy
                    </button>
                  </div>
                  <pre>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      <div className="message-actions">
        <button
          className={`copy-button ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title="Copy message"
        >
          {copied ? '✅ Copied' : '📋 Copy'}
        </button>
      </div>
    </div>
  );
}
