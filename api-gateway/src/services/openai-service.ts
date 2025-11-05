import OpenAI from 'openai';
import { appConfig } from '../config/index.js';

/**
 * OpenAI Service - Provides AI-powered functionality
 */
export class OpenAIService {
  private client: OpenAI;
  private model = 'gpt-4-turbo-preview';

  constructor() {
    if (!appConfig.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey: appConfig.OPENAI_API_KEY,
    });
  }

  /**
   * Generate a chat completion
   */
  async chat(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { messages, temperature = 0.7, maxTokens = 2000 } = params;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Decompose a user query into structured tasks
   */
  async decomposeQuery(query: string): Promise<
    Array<{
      id: string;
      description: string;
      agentType: string;
      reasoning: string;
    }>
  > {
    const systemPrompt = `You are a task decomposition AI. Given a user query about software development, 
break it down into specific, actionable tasks that can be executed by specialized agents.

Available agents:
- github: Searches and analyzes GitHub repositories
- developer: Coordinates other agents and synthesizes results
- repository: Analyzes code structure and content
- relationship: Analyzes dependencies between repositories

Return a JSON array of tasks with this structure:
[
  {
    "description": "Clear, specific task description",
    "agentType": "github|developer|repository|relationship",
    "reasoning": "Why this task is needed"
  }
]

Keep tasks focused and specific. Return ONLY the JSON array, no other text.`;

    const userPrompt = `User query: "${query}"

Decompose this into tasks:`;

    try {
      const response = await this.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Lower temperature for more structured output
      });

      // Parse JSON response
      const tasks = JSON.parse(response) as Array<{
        description: string;
        agentType: string;
        reasoning: string;
      }>;

      // Add IDs
      return tasks.map((task, index) => ({
        id: `task-${Date.now()}-${index}`,
        ...task,
      }));
    } catch (error) {
      console.error('Failed to decompose query:', error);
      // Fallback to simple decomposition
      return [
        {
          id: `task-${Date.now()}-0`,
          description: `Process: ${query}`,
          agentType: 'developer',
          reasoning: 'General query processing',
        },
      ];
    }
  }

  /**
   * Generate a response based on query and context
   */
  async generateResponse(params: {
    query: string;
    context?: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<string> {
    const { query, context, conversationHistory = [] } = params;

    const systemPrompt = `You are a helpful AI assistant specialized in software development and GitHub repository analysis. 
You help developers understand codebases, find relevant repositories, and answer questions about software projects.

Be concise, technical, and accurate. When you don't have enough information, say so clearly.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add context if provided
    if (context) {
      messages.push({
        role: 'system',
        content: `Additional context:\n${context}`,
      });
    }

    // Add current query
    messages.push({
      role: 'user',
      content: query,
    });

    return this.chat({ messages });
  }

  /**
   * Analyze repository information and generate insights
   */
  async analyzeRepository(params: {
    name: string;
    description?: string;
    language?: string;
    topics?: string[];
    readme?: string;
  }): Promise<string> {
    const { name, description, language, topics, readme } = params;

    const prompt = `Analyze this GitHub repository and provide insights:

Repository: ${name}
Description: ${description || 'N/A'}
Primary Language: ${language || 'N/A'}
Topics: ${topics?.join(', ') || 'N/A'}

${readme ? `README:\n${readme.substring(0, 2000)}...` : ''}

Provide a concise analysis covering:
1. Purpose and functionality
2. Key technologies used
3. Potential use cases
4. Notable features or patterns`;

    return this.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });
  }

  /**
   * Summarize multiple search results
   */
  async summarizeResults(params: {
    query: string;
    results: Array<{
      name: string;
      description?: string;
      stars?: number;
      language?: string;
    }>;
  }): Promise<string> {
    const { query, results } = params;

    const resultsText = results
      .map(
        (r, i) =>
          `${i + 1}. ${r.name} (${r.language || 'N/A'}, ⭐${r.stars || 0})\n   ${r.description || 'No description'}`
      )
      .join('\n\n');

    const prompt = `User asked: "${query}"

Found ${results.length} repositories:

${resultsText}

Provide a helpful summary of these search results, highlighting the most relevant repositories and why they match the query.`;

    return this.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      maxTokens: 500,
    });
  }
}

// Singleton instance
let openaiService: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openaiService) {
    openaiService = new OpenAIService();
  }
  return openaiService;
}
