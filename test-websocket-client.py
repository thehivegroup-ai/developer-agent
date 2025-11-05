#!/usr/bin/env python3
"""
WebSocket Test Client - Tests Socket.IO connection
"""

import socketio
import sys
import time

CONVERSATION_ID = sys.argv[1] if len(sys.argv) > 1 else '42327374-aef7-4b04-81b9-0e54ce42a44e'

print(f"🔌 Connecting to WebSocket server...")
print(f"   URL: http://localhost:3000")
print(f"   Conversation ID: {CONVERSATION_ID}\n")

sio = socketio.Client()

@sio.event
def connect():
    print(f"✅ Connected to server")
    print(f"   Socket ID: {sio.sid}\n")
    
    # Join conversation room
    print(f"📬 Joining conversation: {CONVERSATION_ID}")
    sio.emit('join:conversation', {
        'conversationId': CONVERSATION_ID,
        'username': 'python-test-client'
    })

@sio.event
def joined(data):
    print("✅ Successfully joined conversation")
    print(f"   Data: {data}")
    print("\n👂 Listening for events...\n")

@sio.event
def disconnect():
    print("❌ Disconnected from server")

@sio.on('agent:spawned')
def on_agent_spawned(data):
    print("🤖 Agent Spawned:")
    print(f"   {data}")

@sio.on('agent:status')
def on_agent_status(data):
    print("📊 Agent Status:")
    print(f"   {data}")

@sio.on('agent:message')
def on_agent_message(data):
    print("💬 Agent Message:")
    print(f"   {data}")

@sio.on('task:created')
def on_task_created(data):
    print("📝 Task Created:")
    print(f"   {data}")

@sio.on('task:updated')
def on_task_updated(data):
    print("🔄 Task Updated:")
    print(f"   {data}")

@sio.on('query:progress')
def on_query_progress(data):
    print("⏳ Query Progress:")
    print(f"   {data}")

@sio.on('query:completed')
def on_query_completed(data):
    print("✅ Query Completed:")
    print(f"   {data}")

@sio.on('error')
def on_error(data):
    print("❌ Error:")
    print(f"   {data}")

try:
    sio.connect('http://localhost:3000')
    
    print("Press Ctrl+C to exit\n")
    
    # Keep running
    while True:
        time.sleep(1)
        
except KeyboardInterrupt:
    print("\n\n👋 Disconnecting...")
    sio.disconnect()
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
