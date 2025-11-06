/**
 * A2A Agent Card Builder
 *
 * Builds Agent Cards according to A2A Protocol Section 5.
 *
 * Agent Cards are published at /.well-known/agent-card.json and provide:
 * - Agent metadata (id, name, description)
 * - Skills/capabilities the agent provides
 * - Transport configurations (HTTP endpoints)
 * - Owner and contact information
 *
 * Example usage:
 * ```typescript
 * const card = new AgentCardBuilder()
 *   .setId('developer-agent')
 *   .setName('Developer Agent')
 *   .setDescription('Coordinates software development tasks')
 *   .addTransport({
 *     type: 'http',
 *     url: 'http://localhost:3001',
 *     protocol: 'json-rpc-2.0',
 *   })
 *   .addSkill({
 *     id: 'coordinate-development',
 *     name: 'Coordinate Development',
 *     description: 'Coordinates multiple agents to complete development tasks',
 *   })
 *   .build();
 * ```
 */

import type { AgentCard, AgentSkill, AgentTransport } from './types';

/**
 * Builder for creating A2A-compliant Agent Cards.
 */
export class AgentCardBuilder {
  private card: Partial<AgentCard> = {
    version: '0.3.0',
    skills: [],
    transports: [],
  };

  /**
   * Set the agent ID (required).
   *
   * @param id Unique agent identifier
   * @returns this builder
   */
  setId(id: string): this {
    this.card.id = id;
    return this;
  }

  /**
   * Set the agent name (required).
   *
   * @param name Human-readable agent name
   * @returns this builder
   */
  setName(name: string): this {
    this.card.name = name;
    return this;
  }

  /**
   * Set the agent description (required).
   *
   * @param description What the agent does
   * @returns this builder
   */
  setDescription(description: string): this {
    this.card.description = description;
    return this;
  }

  /**
   * Add a skill to the agent.
   *
   * @param skill Agent skill/capability
   * @returns this builder
   */
  addSkill(skill: AgentSkill): this {
    this.card.skills ??= [];
    this.card.skills.push(skill);
    return this;
  }

  /**
   * Add multiple skills to the agent.
   *
   * @param skills Array of skills
   * @returns this builder
   */
  addSkills(skills: AgentSkill[]): this {
    for (const skill of skills) {
      this.addSkill(skill);
    }
    return this;
  }

  /**
   * Add a transport configuration.
   *
   * @param transport Transport configuration
   * @returns this builder
   */
  addTransport(transport: AgentTransport): this {
    this.card.transports ??= [];
    this.card.transports.push(transport);
    return this;
  }

  /**
   * Set the agent owner information.
   *
   * @param owner Owner details
   * @returns this builder
   */
  setOwner(owner: { name: string; email?: string; url?: string }): this {
    this.card.owner = owner;
    return this;
  }

  /**
   * Set contact information.
   *
   * @param contact Contact details
   * @returns this builder
   */
  setContact(contact: { email?: string; url?: string }): this {
    this.card.contact = contact;
    return this;
  }

  /**
   * Set terms of service URL.
   *
   * @param url Terms of service URL
   * @returns this builder
   */
  setTermsOfService(url: string): this {
    this.card.termsOfService = url;
    return this;
  }

  /**
   * Set privacy policy URL.
   *
   * @param url Privacy policy URL
   * @returns this builder
   */
  setPrivacyPolicy(url: string): this {
    this.card.privacyPolicy = url;
    return this;
  }

  /**
   * Set custom metadata.
   *
   * @param metadata Custom metadata object
   * @returns this builder
   */
  setMetadata(metadata: Record<string, unknown>): this {
    this.card.metadata = metadata;
    return this;
  }

  /**
   * Build and validate the Agent Card.
   *
   * @returns The complete Agent Card
   * @throws Error if required fields are missing
   */
  build(): AgentCard {
    // Validate required fields
    if (!this.card.id) {
      throw new Error('Agent Card must have an id');
    }
    if (!this.card.name) {
      throw new Error('Agent Card must have a name');
    }
    if (!this.card.description) {
      throw new Error('Agent Card must have a description');
    }
    if (!this.card.skills || this.card.skills.length === 0) {
      throw new Error('Agent Card must have at least one skill');
    }
    if (!this.card.transports || this.card.transports.length === 0) {
      throw new Error('Agent Card must have at least one transport');
    }

    return this.card as AgentCard;
  }

  /**
   * Build and return as JSON string.
   *
   * @param pretty Whether to pretty-print the JSON
   * @returns JSON string
   */
  buildJson(pretty = true): string {
    const card = this.build();
    return JSON.stringify(card, null, pretty ? 2 : 0);
  }

  /**
   * Reset the builder to start fresh.
   *
   * @returns this builder
   */
  reset(): this {
    this.card = {
      version: '0.3.0',
      skills: [],
      transports: [],
    };
    return this;
  }
}

/**
 * Pre-configured Agent Card templates for common agent types.
 */
export class AgentCardTemplates {
  /**
   * Create a Developer Agent card template.
   *
   * @param baseUrl Base URL for the agent endpoint
   * @returns Agent Card Builder with template applied
   */
  static developerAgent(baseUrl: string): AgentCardBuilder {
    return new AgentCardBuilder()
      .setId('developer-agent')
      .setName('Developer Agent')
      .setDescription(
        'Coordinates software development tasks across multiple specialized agents. ' +
          'Acts as a supervisor for GitHub discovery, repository analysis, and relationship mapping.'
      )
      .addTransport({
        type: 'http',
        url: baseUrl,
        protocol: 'json-rpc-2.0',
        authentication: {
          type: 'bearer',
          description: 'Bearer token authentication',
        },
      })
      .addSkill({
        id: 'coordinate-development',
        name: 'Coordinate Development Tasks',
        description:
          'Coordinates multiple agents to complete complex software development tasks. ' +
          'Delegates to GitHub Agent for repository discovery, Repository Agents for code analysis, ' +
          'and Relationship Agent for knowledge graph building.',
        examples: [
          {
            input: 'Analyze repository thehivegroup-ai/developer-agent',
            output: 'Coordinates analysis across GitHub Agent and Repository Agents',
            description: 'Discovers repository, analyzes code, and builds knowledge graph',
          },
        ],
      })
      .addSkill({
        id: 'supervise-collaboration',
        name: 'Supervise Agent Collaboration',
        description:
          'Monitors and coordinates collaboration between specialized agents. ' +
          'Observes agent interactions and intervenes when needed.',
      });
  }

  /**
   * Create a GitHub Agent card template.
   *
   * @param baseUrl Base URL for the agent endpoint
   * @returns Agent Card Builder with template applied
   */
  static githubAgent(baseUrl: string): AgentCardBuilder {
    return new AgentCardBuilder()
      .setId('github-agent')
      .setName('GitHub Agent')
      .setDescription(
        'Discovers and extracts metadata from GitHub repositories. ' +
          'Provides repository information including structure, languages, and dependencies.'
      )
      .addTransport({
        type: 'http',
        url: baseUrl,
        protocol: 'json-rpc-2.0',
        authentication: {
          type: 'bearer',
          description: 'Bearer token authentication',
        },
      })
      .addSkill({
        id: 'search-repositories',
        name: 'Search GitHub Repositories',
        description:
          'Searches for repositories on GitHub by owner, name, or topic. ' +
          'Returns repository metadata including URL, description, and primary language.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        },
        examples: [
          {
            input: 'Search for repository thehivegroup-ai/developer-agent',
            output: 'Returns repository metadata and clone URL',
            description: 'Finds and returns information about the repository',
          },
        ],
      })
      .addSkill({
        id: 'extract-metadata',
        name: 'Extract Repository Metadata',
        description:
          'Extracts comprehensive metadata from a GitHub repository including ' +
          'languages, dependencies, file structure, and configuration.',
      });
  }

  /**
   * Create a Repository Agent card template.
   *
   * @param baseUrl Base URL for the agent endpoint
   * @param repoType Type of repository (e.g., 'angular', 'csharp-api')
   * @returns Agent Card Builder with template applied
   */
  static repositoryAgent(baseUrl: string, repoType: string): AgentCardBuilder {
    return new AgentCardBuilder()
      .setId(`repository-agent-${repoType}`)
      .setName(`Repository Agent (${repoType})`)
      .setDescription(
        `Analyzes ${repoType} repositories. Extracts code structure, dependencies, ` +
          'and architectural patterns specific to this technology stack.'
      )
      .addTransport({
        type: 'http',
        url: baseUrl,
        protocol: 'json-rpc-2.0',
        authentication: {
          type: 'bearer',
          description: 'Bearer token authentication',
        },
      })
      .addSkill({
        id: 'analyze-repository',
        name: `Analyze ${repoType} Repository`,
        description:
          `Performs deep analysis of ${repoType} repositories. Extracts code structure, ` +
          'identifies patterns, analyzes dependencies, and generates insights.',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryPath: { type: 'string', description: 'Path to repository' },
            analysisDepth: {
              type: 'string',
              enum: ['shallow', 'deep'],
              description: 'Analysis depth',
            },
          },
          required: ['repositoryPath'],
        },
      })
      .addSkill({
        id: 'extract-dependencies',
        name: 'Extract Dependencies',
        description: `Identifies and extracts dependencies from ${repoType} project files.`,
      });
  }

  /**
   * Create a Relationship Agent card template.
   *
   * @param baseUrl Base URL for the agent endpoint
   * @returns Agent Card Builder with template applied
   */
  static relationshipAgent(baseUrl: string): AgentCardBuilder {
    return new AgentCardBuilder()
      .setId('relationship-agent')
      .setName('Relationship Agent')
      .setDescription(
        'Builds and maintains a knowledge graph of relationships between code entities. ' +
          'Maps dependencies, function calls, class hierarchies, and module connections.'
      )
      .addTransport({
        type: 'http',
        url: baseUrl,
        protocol: 'json-rpc-2.0',
        authentication: {
          type: 'bearer',
          description: 'Bearer token authentication',
        },
      })
      .addSkill({
        id: 'build-knowledge-graph',
        name: 'Build Knowledge Graph',
        description:
          'Constructs a Neo4j knowledge graph from code analysis results. ' +
          'Maps relationships between files, classes, functions, and dependencies.',
        inputSchema: {
          type: 'object',
          properties: {
            analysisResults: {
              type: 'array',
              description: 'Code analysis results from Repository Agents',
            },
          },
          required: ['analysisResults'],
        },
      })
      .addSkill({
        id: 'query-relationships',
        name: 'Query Code Relationships',
        description:
          'Queries the knowledge graph to find relationships between code entities. ' +
          'Supports queries for dependencies, call hierarchies, and impact analysis.',
      });
  }
}
