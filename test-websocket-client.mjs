#!/usr/bin/env node

/**
 * WebSocket Test Client - Tests Socket.IO connection and event handling
 */

import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';
const CONVERSATION_ID = process.argv[2] || '0717ba8b-83a2-41c5-a9eb-e5bf283e0aef';

console.log('🔌 Connecting to WebSocket server...');
console.log(`   URL: ${SOCKET_URL}`);
console.log(`   Conversation ID: ${CONVERSATION_ID}\n`);

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log(`   Socket ID: ${socket.id}\n`);

  // Join a conversation room
  console.log(`📬 Joining conversation: ${CONVERSATION_ID}`);
  socket.emit('join:conversation', {
    conversationId: CONVERSATION_ID,
    username: 'test-client',
  });
});

socket.on('joined', (data) => {
  console.log('✅ Successfully joined conversation');
  console.log('   Data:', JSON.stringify(data, null, 2));
  console.log('\n👂 Listening for events...\n');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

// Agent events
socket.on('agent:spawned', (data) => {
  console.log('🤖 Agent Spawned:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

socket.on('agent:status', (data) => {
  console.log('📊 Agent Status:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

socket.on('agent:message', (data) => {
  console.log('💬 Agent Message:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

// Task events
socket.on('task:created', (data) => {
  console.log('📝 Task Created:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

socket.on('task:updated', (data) => {
  console.log('🔄 Task Updated:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

// Query events
socket.on('query:progress', (data) => {
  console.log('⏳ Query Progress:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

socket.on('query:completed', (data) => {
  console.log('✅ Query Completed:');
  console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

// Error events
socket.on('error', (data) => {
  console.error('❌ Error:');
  console.error('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
});

// Keep the process running
console.log('Press Ctrl+C to exit\n');
process.on('SIGINT', () => {
  console.log('\n\n👋 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});
