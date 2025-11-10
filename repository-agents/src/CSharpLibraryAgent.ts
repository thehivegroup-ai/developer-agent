import { BaseAgent, type BaseAgentConfig } from '@developer-agent/shared';
import { Octokit } from '@octokit/rest';

interface CsProjDependency {
  name: string;
  version: string;
  isDev: boolean;
  category:
    | 'framework'
    | 'database'
    | 'utility'
    | 'testing'
    | 'logging'
    | 'serialization'
    | 'other';
  type: 'package' | 'project'; // Package reference or project reference
  isInternal: boolean; // True if from same organization/namespace
  projectPath?: string; // For project references, the relative path
}

interface AnalysisResult {
  repository: string;
  framework: string;
  dependencies: CsProjDependency[];
  fileStructure: string[];
}

interface AnalyzeRequest {
  action: 'analyze' | 'search';
  owner: string;
  repo: string;
  branch?: string;
}

/**
 * C# Library Repository Agent
 * Analyzes C# library repositories, extracts NuGet dependencies from .csproj files
 */
export class CSharpLibraryAgent extends BaseAgent {
  private octokit: Octokit | null = null;
  private analysisCache = new Map<string, AnalysisResult>();

  constructor(repositoryName: string, config?: Partial<BaseAgentConfig>) {
    super({
      agentType: 'repository',
      repositoryType: 'csharp-library',
      repositoryName,
      ttlMinutes: config?.ttlMinutes || 60,
      ...config,
    });
  }

  async init(): Promise<void> {
    // Initialize GitHub client
    const githubToken = process.env.GITHUB_TOKEN;
    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'A2A-Developer-Agent/1.0',
    });

    console.log(`✅ C# Library Agent initialized for ${this.repositoryName}`);
  }

  override async handleRequest(request: unknown): Promise<unknown> {
    const req = request as AnalyzeRequest;

    switch (req.action) {
      case 'analyze':
        return await this.analyzeRepository(req.owner, req.repo, req.branch);
      default:
        return { error: 'Unknown action' };
    }
  }

  /**
   * Analyze C# repository - extract dependencies from .csproj files
   */
  async analyzeRepository(owner: string, repo: string, branch = 'main'): Promise<AnalysisResult> {
    const cacheKey = `${owner}/${repo}:${branch}`;

    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      console.log(`   📦 Returning cached analysis for ${cacheKey}`);
      return this.analysisCache.get(cacheKey)!;
    }

    try {
      if (!this.octokit) {
        throw new Error('GitHub client not initialized');
      }

      console.log(`   🔍 Analyzing C# repository: ${owner}/${repo}@${branch}`);

      // Get repository structure to find .csproj files
      const { data: tree } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });

      // Find all .csproj files
      const csprojFiles = tree.tree
        .filter((item) => item.path?.endsWith('.csproj') && item.type === 'blob')
        .map((item) => item.path!);

      console.log(`   📄 Found ${csprojFiles.length} .csproj file(s)`);

      if (csprojFiles.length === 0) {
        throw new Error('No .csproj files found in repository');
      }

      // Analyze ALL .csproj files and merge dependencies
      const allDependencies = new Map<string, CsProjDependency>();
      let detectedFramework = 'Unknown .NET';

      for (const csprojPath of csprojFiles) {
        console.log(`   📦 Analyzing ${csprojPath}...`);

        const csprojContent = await this.getFileContent(owner, repo, csprojPath, branch);

        if (!csprojContent) {
          console.log(`   ⚠️  Could not read ${csprojPath}, skipping`);
          continue;
        }

        // Parse dependencies from this .csproj
        const dependencies = this.parseCsProjDependencies(csprojContent, owner, repo);

        // Merge dependencies (use Map to deduplicate by name, keeping highest version)
        for (const dep of dependencies) {
          const existing = allDependencies.get(dep.name);
          // For project references, always add (don't deduplicate)
          // For packages, keep highest version
          if (dep.type === 'project') {
            allDependencies.set(`${dep.name}-${dep.projectPath}`, dep);
          } else if (!existing || this.compareVersions(dep.version, existing.version) > 0) {
            allDependencies.set(dep.name, dep);
          }
        }

        // Detect framework from first .csproj (or highest version found)
        const framework = this.detectFramework(dependencies, csprojContent);
        if (framework !== 'Unknown .NET') {
          detectedFramework = framework;
        }
      }

      const dependencies = Array.from(allDependencies.values());

      console.log(
        `   ✅ Extracted ${dependencies.length} unique dependencies from ${csprojFiles.length} .csproj file(s)`
      );
      console.log(`   🎯 Detected framework: ${detectedFramework}`);

      const result: AnalysisResult = {
        repository: `${owner}/${repo}`,
        framework: detectedFramework,
        dependencies,
        fileStructure: tree.tree.map((item) => item.path!),
      };

      // Cache result
      this.analysisCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error(`   ❌ Error analyzing C# repository:`, error);
      return {
        repository: `${owner}/${repo}`,
        framework: 'unknown',
        dependencies: [],
        fileStructure: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      } as AnalysisResult & { error: string };
    }
  }

  /**
   * Get file content from GitHub
   */
  private async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string
  ): Promise<string | null> {
    try {
      if (!this.octokit) return null;

      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch (error) {
      console.log(`   ⚠️  Could not read ${path}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Parse .csproj XML to extract both PackageReference and ProjectReference dependencies
   */
  private parseCsProjDependencies(
    csprojXml: string,
    owner: string,
    _repo: string
  ): CsProjDependency[] {
    const dependencies: CsProjDependency[] = [];

    // Parse PackageReference elements
    // Match <PackageReference Include="PackageName" Version="1.2.3" />
    const packageReferenceRegex =
      /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"\s*\/>/gi;
    let match;

    while ((match = packageReferenceRegex.exec(csprojXml)) !== null) {
      const name = match[1];
      const version = match[2];

      if (!name || !version) continue;

      const category = this.categorizeDependency(name);
      const isDev = this.isDevDependency(name);
      const isInternal = this.isInternalDependency(name, owner);

      dependencies.push({
        name,
        version,
        isDev,
        category,
        type: 'package',
        isInternal,
      });
    }

    // Parse ProjectReference elements
    // Match <ProjectReference Include="..\ProjectName\ProjectName.csproj" />
    const projectReferenceRegex = /<ProjectReference\s+Include="([^"]+)"\s*\/>/gi;

    while ((match = projectReferenceRegex.exec(csprojXml)) !== null) {
      const projectPath = match[1];

      if (!projectPath) continue;

      // Extract project name from path (e.g., "..\ProjectName\ProjectName.csproj" -> "ProjectName")
      const projectName = this.extractProjectName(projectPath);

      dependencies.push({
        name: projectName,
        version: 'project-reference',
        isDev: false,
        category: 'other',
        type: 'project',
        isInternal: true, // Project references are always internal
        projectPath,
      });
    }

    return dependencies;
  }

  /**
   * Extract project name from project reference path
   * Examples:
   *   "..\ProjectName\ProjectName.csproj" -> "ProjectName"
   *   "..\Cortside.AspNetCore\Cortside.AspNetCore.csproj" -> "Cortside.AspNetCore"
   */
  private extractProjectName(projectPath: string): string {
    // Remove .csproj extension
    const withoutExtension = projectPath.replace(/\.csproj$/i, '');

    // Split by path separators (both \ and /)
    const parts = withoutExtension.split(/[/\\]/);

    // Return the last part (project name)
    return parts[parts.length - 1] || projectPath;
  }

  /**
   * Check if a package dependency is internal (from same organization)
   * Internal packages typically:
   * - Share the same namespace prefix (e.g., "Cortside.*")
   * - Come from the same GitHub organization
   */
  private isInternalDependency(packageName: string, owner: string): boolean {
    const nameLower = packageName.toLowerCase();
    const ownerLower = owner.toLowerCase();

    // Check if package name starts with owner name
    // Examples:
    //   Owner: "cortside", Package: "Cortside.Common.Messages" -> true
    //   Owner: "cortside", Package: "Microsoft.AspNetCore" -> false
    if (nameLower.startsWith(ownerLower + '.')) {
      return true;
    }

    // Check if package name contains owner name as a namespace segment
    // Examples:
    //   Owner: "cortside", Package: "Cortside.AspNetCore.Swagger" -> true
    const nameParts = nameLower.split('.');
    if (nameParts[0] === ownerLower) {
      return true;
    }

    return false;
  }

  /**
   * Categorize NuGet package by name
   */
  private categorizeDependency(
    name: string
  ): 'framework' | 'database' | 'utility' | 'testing' | 'logging' | 'serialization' | 'other' {
    const nameLower = name.toLowerCase();

    // Framework
    if (
      nameLower.includes('aspnetcore') ||
      nameLower.includes('microsoft.extensions') ||
      nameLower === 'microsoft.aspnetcore.app'
    ) {
      return 'framework';
    }

    // Database
    if (
      nameLower.includes('entityframework') ||
      nameLower.includes('dapper') ||
      nameLower.includes('npgsql') ||
      nameLower.includes('sqlclient') ||
      nameLower.includes('mongodb')
    ) {
      return 'database';
    }

    // Testing
    if (
      nameLower.includes('xunit') ||
      nameLower.includes('nunit') ||
      nameLower.includes('moq') ||
      nameLower.includes('fluentassertions') ||
      nameLower.includes('test')
    ) {
      return 'testing';
    }

    // Logging
    if (
      nameLower.includes('serilog') ||
      nameLower.includes('nlog') ||
      nameLower.includes('log4net')
    ) {
      return 'logging';
    }

    // Serialization
    if (
      nameLower.includes('newtonsoft.json') ||
      nameLower.includes('system.text.json') ||
      nameLower.includes('protobuf')
    ) {
      return 'serialization';
    }

    // Utility
    if (
      nameLower.includes('automapper') ||
      nameLower.includes('fluentvalidation') ||
      nameLower.includes('mediatr') ||
      nameLower.includes('polly')
    ) {
      return 'utility';
    }

    return 'other';
  }

  /**
   * Check if dependency is dev/test only
   */
  private isDevDependency(name: string): boolean {
    const nameLower = name.toLowerCase();
    return (
      nameLower.includes('test') ||
      nameLower.includes('xunit') ||
      nameLower.includes('nunit') ||
      nameLower.includes('moq') ||
      nameLower.includes('fluentassertions') ||
      nameLower.includes('coverlet') ||
      nameLower.includes('analyzers')
    );
  }

  /**
   * Compare two semantic version strings
   * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Detect framework from dependencies and .csproj content
   */
  private detectFramework(dependencies: CsProjDependency[], csprojContent: string): string {
    // Check for ASP.NET Core
    if (dependencies.some((d) => d.name.includes('Microsoft.AspNetCore'))) {
      return 'ASP.NET Core';
    }

    // Check target framework from .csproj
    const targetFrameworkMatch = csprojContent.match(
      /<TargetFramework>([^<]+)<\/TargetFramework>/i
    );
    if (targetFrameworkMatch) {
      const framework = targetFrameworkMatch[1];
      if (!framework) return 'Unknown .NET';

      if (framework.startsWith('net6')) return '.NET 6';
      if (framework.startsWith('net7')) return '.NET 7';
      if (framework.startsWith('net8')) return '.NET 8';
      if (framework.startsWith('net5')) return '.NET 5';
      if (framework.startsWith('netcoreapp')) return '.NET Core';
      if (framework.startsWith('netstandard')) return '.NET Standard';
      return framework;
    }

    return 'Unknown .NET';
  }

  async shutdown(): Promise<void> {
    this.analysisCache.clear();
    console.log(`🔴 C# Library Agent shut down for ${this.repositoryName}`);
    return Promise.resolve();
  }
}
