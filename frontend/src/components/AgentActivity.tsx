import { useWebSocket } from '../context/WebSocketContext';
import './AgentActivity.css';

const getEventIcon = (type: string) => {
  switch (type) {
    case 'agent:spawned':
      return '🚀';
    case 'agent:status':
      return '📊';
    case 'agent:message':
      return '💬';
    case 'task:created':
      return '📝';
    case 'task:updated':
      return '✏️';
    case 'query:progress':
      return '⏳';
    case 'query:completed':
      return '✅';
    case 'error':
      return '❌';
    default:
      return '📢';
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'agent:spawned':
      return '#10b981';
    case 'agent:status':
      return '#3b82f6';
    case 'agent:message':
      return '#8b5cf6';
    case 'task:created':
      return '#f59e0b';
    case 'task:updated':
      return '#eab308';
    case 'query:progress':
      return '#06b6d4';
    case 'query:completed':
      return '#22c55e';
    case 'error':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

export default function AgentActivity() {
  const { activities, connected, clearActivities } = useWebSocket();

  return (
    <div className="agent-activity">
      <div className="activity-header">
        <h3>🤖 Agent Activity</h3>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Live' : '🔴 Offline'}
        </div>
      </div>

      {activities.length > 0 && (
        <button className="clear-button" onClick={clearActivities}>
          Clear All
        </button>
      )}

      <div className="activity-list">
        {activities.length === 0 ? (
          <div className="empty-activity">
            <p>No activity yet</p>
            <p className="empty-hint">Agent events will appear here in real-time</p>
          </div>
        ) : (
          activities.map((activity) => {
            const data = activity.data as any;
            return (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon" style={{ color: getEventColor(activity.type) }}>
                  {getEventIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-type">{activity.type.replace(':', ' › ')}</div>
                  <div className="activity-data">
                    {data.agentId && (
                      <div className="activity-field">
                        <span className="field-label">Agent:</span>
                        <span className="field-value">{data.agentId.substring(0, 8)}...</span>
                      </div>
                    )}
                    {data.agentType && (
                      <div className="activity-field">
                        <span className="field-label">Type:</span>
                        <span className="field-value agent-type">{data.agentType}</span>
                      </div>
                    )}
                    {data.status && (
                      <div className="activity-field">
                        <span className="field-label">Status:</span>
                        <span className="field-value">{data.status}</span>
                      </div>
                    )}
                    {data.progress !== undefined && (
                      <div className="activity-field">
                        <span className="field-label">Progress:</span>
                        <span className="field-value">{data.progress}%</span>
                      </div>
                    )}
                    {data.message && <div className="activity-message">{data.message}</div>}
                    {data.error && <div className="activity-error">{data.error}</div>}
                  </div>
                  <div className="activity-timestamp">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
