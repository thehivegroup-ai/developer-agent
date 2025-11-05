#!/usr/bin/env node
/**
 * Demo: AI-Powered Developer Agent
 *
 * This script demonstrates the OpenAI integration features:
 * 1. Intelligent query decomposition
 * 2. Smart response generation
 * 3. Repository analysis
 * 4. Search result summarization
 */

import { getOpenAIService } from '../api-gateway/src/services/openai-service.js';
import { appConfig } from '../api-gateway/src/config/index.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color: string, title: string, message: string) {
  console.log(`${color}${colors.bright}${title}${colors.reset}`);
  console.log(message);
  console.log();
}

async function demo() {
  console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════╗
║   🤖 AI-Powered Developer Agent Demo                   ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Check if OpenAI API key is configured
  if (!appConfig.OPENAI_API_KEY) {
    console.error(`${colors.yellow}⚠️  OPENAI_API_KEY not found in environment${colors.reset}`);
    console.log(`
Please add your OpenAI API key to .env.local:

  OPENAI_API_KEY=sk-proj-...your-key-here...

Get your key from: https://platform.openai.com/api-keys
`);
    process.exit(1);
  }

  const openai = getOpenAIService();

  console.log(`${colors.green}✓ OpenAI service initialized${colors.reset}\n`);

  // Demo 1: Query Decomposition
  log(
    colors.cyan,
    '📋 Demo 1: Intelligent Query Decomposition',
    'Breaking down a complex query into actionable tasks...'
  );

  const query1 = 'Find popular TypeScript libraries for state management with React hooks support';
  console.log(`Query: "${query1}"\n`);

  try {
    const tasks = await openai.decomposeQuery(query1);

    console.log(`${colors.green}✓ Generated ${tasks.length} tasks:${colors.reset}\n`);

    tasks.forEach((task, i) => {
      console.log(`${colors.bright}Task ${i + 1}:${colors.reset}`);
      console.log(`  Description: ${task.description}`);
      console.log(`  Agent: ${task.agentType}`);
      console.log(`  Reasoning: ${task.reasoning}`);
      console.log();
    });
  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error);
  }

  // Demo 2: Response Generation
  log(
    colors.cyan,
    '💬 Demo 2: Context-Aware Response Generation',
    'Generating an intelligent response with context...'
  );

  const query2 = "What's the difference between Zustand and Redux?";
  const context = JSON.stringify({
    repositories: [
      {
        name: 'pmndrs/zustand',
        stars: 42000,
        description: 'A small, fast and scalable bearbones state-management solution',
      },
      {
        name: 'reduxjs/redux',
        stars: 60000,
        description: 'Predictable state container for JavaScript apps',
      },
    ],
  });

  console.log(`Query: "${query2}"\n`);

  try {
    const response = await openai.generateResponse({
      query: query2,
      context,
    });

    console.log(`${colors.green}✓ AI Response:${colors.reset}\n`);
    console.log(response);
    console.log();
  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error);
  }

  // Demo 3: Repository Analysis
  log(colors.cyan, '🔍 Demo 3: AI Repository Analysis', 'Analyzing a repository using AI...');

  try {
    const analysis = await openai.analyzeRepository({
      name: 'fastify/fastify',
      description: 'Fast and low overhead web framework, for Node.js',
      language: 'JavaScript',
      topics: ['fastify', 'nodejs', 'web-framework', 'performance'],
      readme: `# Fastify

An efficient server implies a lower cost of the infrastructure, 
a better responsiveness under load and happy users.

Fastify is a web framework highly focused on providing the best 
developer experience with the least overhead and a powerful plugin 
architecture, inspired by Hapi and Express.`,
    });

    console.log(`${colors.green}✓ Repository Analysis:${colors.reset}\n`);
    console.log(analysis);
    console.log();
  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error);
  }

  // Demo 4: Search Result Summarization
  log(
    colors.cyan,
    '📊 Demo 4: Search Result Summarization',
    'Summarizing multiple search results...'
  );

  const searchQuery = 'TypeScript REST API frameworks';
  const results = [
    {
      name: 'nestjs/nest',
      description:
        'A progressive Node.js framework for building efficient and scalable server-side applications',
      stars: 65000,
      language: 'TypeScript',
    },
    {
      name: 'fastify/fastify',
      description: 'Fast and low overhead web framework, for Node.js',
      stars: 31000,
      language: 'JavaScript',
    },
    {
      name: 'microsoft/tsoa',
      description: 'Build OpenAPI-compliant REST APIs using TypeScript and Node',
      stars: 3500,
      language: 'TypeScript',
    },
  ];

  console.log(`Query: "${searchQuery}"`);
  console.log(`Found ${results.length} repositories\n`);

  try {
    const summary = await openai.summarizeResults({
      query: searchQuery,
      results,
    });

    console.log(`${colors.green}✓ AI Summary:${colors.reset}\n`);
    console.log(summary);
    console.log();
  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error);
  }

  // Demo 5: Conversation with Memory
  log(colors.cyan, '💭 Demo 5: Conversation with Memory', 'Having a multi-turn conversation...');

  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Turn 1
  console.log(`${colors.bright}User:${colors.reset} What is Fastify?\n`);

  try {
    const response1 = await openai.generateResponse({
      query: 'What is Fastify?',
      conversationHistory,
    });

    console.log(`${colors.green}Assistant:${colors.reset}\n${response1}\n`);

    conversationHistory.push({ role: 'user', content: 'What is Fastify?' });
    conversationHistory.push({ role: 'assistant', content: response1 });

    // Turn 2 - referencing previous context
    console.log(`${colors.bright}User:${colors.reset} How does it compare to Express?\n`);

    const response2 = await openai.generateResponse({
      query: 'How does it compare to Express?',
      conversationHistory,
    });

    console.log(`${colors.green}Assistant:${colors.reset}\n${response2}\n`);
  } catch (error) {
    console.error(`${colors.yellow}Error:${colors.reset}`, error);
  }

  console.log(`${colors.bright}${colors.green}
╔════════════════════════════════════════════════════════╗
║   ✨ Demo Complete!                                    ║
╚════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`
${colors.bright}Next Steps:${colors.reset}

1. Try the API endpoints:
   ${colors.cyan}curl -X POST http://localhost:3000/api/chat/threads/test/messages \\
     -H "Content-Type: application/json" \\
     -d '{"content": "Find React state libraries", "userId": "demo"}'${colors.reset}

2. Monitor token usage in OpenAI dashboard:
   ${colors.cyan}https://platform.openai.com/usage${colors.reset}

3. Check out the full documentation:
   ${colors.cyan}docs/OPENAI_INTEGRATION.md${colors.reset}
`);
}

// Run the demo
demo().catch((error) => {
  console.error(`${colors.yellow}Demo failed:${colors.reset}`, error);
  process.exit(1);
});
