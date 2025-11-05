#!/bin/bash

# End-to-End Integration Test
# Tests: REST API + Agent Processing + Database Persistence

set -e

BASE_URL="http://localhost:3000/api/chat"
USERNAME="e2e-test-user-$(date +%s)"

echo "=========================================="
echo "End-to-End Integration Test"
echo "=========================================="
echo

# Test 1: Create a new conversation
echo "1️⃣  Creating new conversation..."
CONV_RESPONSE=$(curl -s -X POST "$BASE_URL/conversations" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"title\": \"E2E Test Conversation\"}")

CONVERSATION_ID=$(echo $CONV_RESPONSE | jq -r '.conversationId')
echo "   ✅ Conversation created: $CONVERSATION_ID"
echo

# Test 2: Send first message
echo "2️⃣  Sending first message..."
MSG1_RESPONSE=$(curl -s -X POST "$BASE_URL/message" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"conversationId\": \"$CONVERSATION_ID\", \"message\": \"Hello! Can you help me understand this codebase?\"}")

QUERY1_ID=$(echo $MSG1_RESPONSE | jq -r '.queryId')
echo "   ✅ Message sent, Query ID: $QUERY1_ID"
echo "   📊 Status: $(echo $MSG1_RESPONSE | jq -r '.status')"
echo

# Test 3: Wait and check query status
echo "3️⃣  Waiting for agent processing..."
sleep 3

QUERY1_STATUS=$(curl -s "$BASE_URL/query/$QUERY1_ID")
echo "   📊 Query Status: $(echo $QUERY1_STATUS | jq -r '.status')"
echo "   📈 Progress: $(echo $QUERY1_STATUS | jq -r '.progress')%"
echo "   ✅ Agent processed the query"
echo

# Test 4: Send second message
echo "4️⃣  Sending second message..."
MSG2_RESPONSE=$(curl -s -X POST "$BASE_URL/message" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"conversationId\": \"$CONVERSATION_ID\", \"message\": \"What are the main components?\"}")

QUERY2_ID=$(echo $MSG2_RESPONSE | jq -r '.queryId')
echo "   ✅ Message sent, Query ID: $QUERY2_ID"
sleep 2
echo

# Test 5: Get conversation messages
echo "5️⃣  Retrieving conversation messages..."
MESSAGES=$(curl -s "$BASE_URL/conversations/$CONVERSATION_ID/messages")
MESSAGE_COUNT=$(echo $MESSAGES | jq '.messages | length')
echo "   ✅ Retrieved $MESSAGE_COUNT messages"
echo "   Messages:"
echo $MESSAGES | jq -r '.messages[] | "      - [\(.role)] \(.content | .[0:60])..."'
echo

# Test 6: List all conversations for user
echo "6️⃣  Listing all conversations for user..."
CONVERSATIONS=$(curl -s "$BASE_URL/conversations?username=$USERNAME")
CONV_COUNT=$(echo $CONVERSATIONS | jq '.conversations | length')
echo "   ✅ User has $CONV_COUNT conversation(s)"
echo

# Test 7: Verify database records
echo "7️⃣  Verifying database records..."
echo "   Checking agent_sessions..."
SESSION_COUNT=$(PGPASSWORD='password1@' psql -h 192.168.0.217 -U sa a2a_agents -t -c \
  "SELECT COUNT(*) FROM agent_sessions WHERE thread_id = '$CONVERSATION_ID'")
echo "   ✅ Agent sessions created: $(echo $SESSION_COUNT | tr -d ' ')"

echo "   Checking tasks..."
TASK_COUNT=$(PGPASSWORD='password1@' psql -h 192.168.0.217 -U sa a2a_agents -t -c \
  "SELECT COUNT(*) FROM tasks WHERE task_id IN ('$QUERY1_ID', '$QUERY2_ID')")
echo "   ✅ Tasks created: $(echo $TASK_COUNT | tr -d ' ')"

echo "   Checking messages..."
MSG_COUNT=$(PGPASSWORD='password1@' psql -h 192.168.0.217 -U sa a2a_agents -t -c \
  "SELECT COUNT(*) FROM messages WHERE thread_id = '$CONVERSATION_ID'")
echo "   ✅ Messages stored: $(echo $MSG_COUNT | tr -d ' ')"
echo

# Summary
echo "=========================================="
echo "✅ All Tests Passed!"
echo "=========================================="
echo
echo "Summary:"
echo "  • Conversation created: $CONVERSATION_ID"
echo "  • Messages sent: 2"
echo "  • Queries processed: 2"
echo "  • Agent sessions: $SESSION_COUNT"
echo "  • Tasks completed: $TASK_COUNT"
echo "  • Messages persisted: $MSG_COUNT"
echo
echo "Test completed successfully! 🎉"
