import { useState, useEffect } from 'react';
import { ChatProvider } from './context/ChatContext';
import { WebSocketProvider } from './context/WebSocketContext';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [username, setUsername] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for existing username in localStorage
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (name: string) => {
    setUsername(name);
    setIsLoggedIn(true);
    localStorage.setItem('username', name);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    localStorage.removeItem('username');
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🤖 Developer Agent</h1>
          <p>A2A Multi-Agent System</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('username') as string;
              if (name.trim()) {
                handleLogin(name.trim());
              }
            }}
          >
            <input
              type="text"
              name="username"
              placeholder="Enter your username..."
              className="username-input"
              autoFocus
              required
            />
            <button type="submit" className="login-button">
              Start Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ChatProvider username={username}>
        <WebSocketProvider>
          <div className="app">
            <Sidebar />
            <ChatInterface />
            <div className="app-footer">
              <span className="username-display">👤 {username}</span>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </WebSocketProvider>
      </ChatProvider>
    </ErrorBoundary>
  );
}

export default App;
