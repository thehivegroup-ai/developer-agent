#!/bin/bash

# Test script for Chat API endpoints
BASE_URL="http://localhost:3000/api/chat"

echo "=== Testing Chat API Endpoints ==="
echo

# Test 1: Create a new conversation
echo "1. Creating a new conversation..."
CONV_RESPONSE=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "title": "Test Conversation"}')
echo "Response: $CONV_RESPONSE"
CONVERSATION_ID=$(echo $CONV_RESPONSE | jq -r '.conversationId')
echo "Conversation ID: $CONVERSATION_ID"
echo

# Test 2: Send a message
echo "2. Sending a message..."
MSG_RESPONSE=$(curl -s -X POST "$BASE_URL/message" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"testuser\", \"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Hello, agent!\"}")
echo "Response: $MSG_RESPONSE"
QUERY_ID=$(echo $MSG_RESPONSE | jq -r '.queryId')
echo "Query ID: $QUERY_ID"
echo

# Test 3: Get conversations for user
echo "3. Getting conversations for testuser..."
CONVS_RESPONSE=$(curl -s "$BASE_URL/conversations?username=testuser")
echo "Response: $CONVS_RESPONSE" | jq
echo

# Test 4: Get messages from conversation
echo "4. Getting messages from conversation..."
MSGS_RESPONSE=$(curl -s "$BASE_URL/conversations/$CONVERSATION_ID/messages")
echo "Response: $MSGS_RESPONSE" | jq
echo

# Test 5: Check query status
echo "5. Checking query status..."
QUERY_RESPONSE=$(curl -s "$BASE_URL/query/$QUERY_ID")
echo "Response: $QUERY_RESPONSE" | jq
echo

echo "=== Tests Complete ==="
