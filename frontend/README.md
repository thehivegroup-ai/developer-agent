# Developer Agent - React Frontend

React-based chatbot interface for the Developer Agent system with real-time WebSocket updates.

## Features

- 💬 **Chat Interface**: Full-featured chatbot with conversation history
- 🔄 **Real-time Updates**: WebSocket integration showing live agent activity
- 👤 **User Authentication**: Simple username-based login (stored in localStorage)
- 📊 **Agent Activity Panel**: Real-time display of agent spawning, tasks, and progress
- 🎨 **Dark Theme**: Modern dark UI optimized for development work

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Fast development server and build tool
- **Socket.IO Client** - Real-time WebSocket communication
- **Axios** - REST API calls
- **CSS Modules** - Component styling

## Getting Started

### Prerequisites

- Node.js 18+ (running on 18.19.1)
- API Gateway running on port 3000
- PostgreSQL database configured

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server (port 5173)
npx vite

# Or use npm script
npm run dev
```

The frontend will be available at: http://localhost:5173/

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Architecture

### Context Providers

#### ChatContext

Manages chat state and REST API communication:

- Conversation list management
- Message history
- Create/select conversations
- Send messages with optimistic updates

#### WebSocketContext

Manages real-time communication:

- Socket.IO connection management
- Auto-join conversation rooms
- Event listeners for 8 agent activity types
- Activity tracking and display

### Components

#### App

- Main application wrapper
- Login screen
- Provider composition

#### Sidebar

- Conversation list
- New conversation button
- Active conversation highlighting

#### ChatInterface

- Main chat layout
- Message display area
- Input component
- Agent activity panel

#### MessageList

- Scrollable message history
- User/assistant message styling
- Agent type badges
- Auto-scroll to bottom

#### MessageInput

- Text input with send button
- Enter to send (Shift+Enter for new line)
- Loading states
- Disabled during processing

#### AgentActivity

- Real-time activity feed
- 8 event types with color coding
- Connection status indicator
- Clear activities button

## API Integration

### REST Endpoints (via Axios)

```
POST   /api/chat/conversations           - Create conversation
GET    /api/chat/conversations?username= - List conversations
GET    /api/chat/conversations/:id/messages - Get messages
POST   /api/chat/message                 - Send message (async)
GET    /api/chat/query/:queryId          - Get query status
```

### WebSocket Events (via Socket.IO)

The frontend listens for these real-time events:

- `agent:spawned` - New agent initialized
- `agent:status` - Agent status update
- `agent:message` - Agent generated message
- `task:created` - New task started
- `task:updated` - Task progress/completion
- `query:progress` - Query processing progress (%)
- `query:completed` - Query finished
- `error` - Error occurred

## Configuration

### Vite Proxy

The frontend proxies API and WebSocket requests to the backend:

```typescript
{
  '/api': 'http://localhost:3000',           // REST API
  '/socket.io': 'http://localhost:3000'      // WebSocket
}
```

### Environment Variables

No environment variables needed - configuration is embedded in the code.

## Project Structure

```
frontend/
├── index.html                 # HTML entry point
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite configuration
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Main app component
    ├── App.css               # App styles
    ├── index.css             # Global styles
    ├── components/           # UI components
    │   ├── ChatInterface.tsx
    │   ├── Sidebar.tsx
    │   ├── MessageList.tsx
    │   ├── MessageInput.tsx
    │   └── AgentActivity.tsx
    └── context/              # React contexts
        ├── ChatContext.tsx   # Chat state management
        └── WebSocketContext.tsx # WebSocket management
```

## Testing the Frontend

1. **Start the API Gateway** (port 3000):

   ```bash
   cd api-gateway && npm run dev
   ```

2. **Start the Frontend** (port 5173):

   ```bash
   cd frontend && npx vite
   ```

3. **Login**:
   - Enter a username (e.g., "testuser")
   - Click "Login"

4. **Create a Conversation**:
   - Click "+ New Chat" in sidebar

5. **Send a Message**:
   - Type a message in the input area
   - Press Enter or click "Send"

6. **Watch Real-time Updates**:
   - Agent Activity panel shows live progress
   - Messages appear as agents respond
   - Query progress updates in real-time

## Known Issues

- ESLint configuration needs updating to include frontend tsconfig
- Currently using `any` type for WebSocket event data (could be more specific)
- No error boundary component yet
- No offline state handling

## Next Steps

- Add error boundary for graceful error handling
- Implement message markdown rendering
- Add conversation search/filter
- Add user settings panel
- Implement conversation deletion
- Add file upload support
- Implement conversation export

## Phase 6 Status

✅ **Completed**:

- Project structure and configuration
- Context providers (Chat + WebSocket)
- All UI components
- Styling (dark theme)
- Development server running

🔄 **In Progress**:

- Integration testing with real API
- Bug fixes and polish

⏳ **Pending**:

- Production build and deployment
- Performance optimization
- Accessibility improvements
