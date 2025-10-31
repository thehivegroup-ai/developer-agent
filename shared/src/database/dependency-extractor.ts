/**
 * Dependency Extraction Utilities
 *
 * Helper functions to extract dependencies from various file formats.
 * Used by Repository Agents to extract dependency information.
 */

import { Octokit } from '@octokit/rest';
import type { Dependency } from './neo4j-relationships.js';

/**
 * Extract npm dependencies from package.json
 */
export async function extractNpmDependencies(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch = 'main'
): Promise<Dependency[]> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'package.json',
      ref: branch,
    });

    if (!('content' in data) || !data.content) {
      return [];
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const dependencies: Dependency[] = [];

    // Production dependencies
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        dependencies.push({
          name,
          version: version.replace(/[\^~]/, ''), // Remove version prefixes
          ecosystem: 'npm',
          isDirect: true,
        });
      }
    }

    // Dev dependencies (marked as not direct)
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        dependencies.push({
          name,
          version: version.replace(/[\^~]/, ''),
          ecosystem: 'npm',
          isDirect: false,
        });
      }
    }

    return dependencies;
  } catch (error) {
    // File not found or parsing error
    return [];
  }
}

/**
 * Extract NuGet dependencies from .csproj file
 */
export async function extractNuGetDependencies(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch = 'main'
): Promise<Dependency[]> {
  try {
    // Search for .csproj files (check root and src directory)
    const pathsToCheck = ['', 'src', 'Source'];
    const csprojFiles: Array<{ name: string; path: string }> = [];

    for (const basePath of pathsToCheck) {
      try {
        const { data: contents } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: basePath,
          ref: branch,
        });

        if (Array.isArray(contents)) {
          const files = contents
            .filter((item) => item.type === 'file' && item.name.endsWith('.csproj'))
            .map((item) => ({ name: item.name, path: item.path }));
          csprojFiles.push(...files);

          // Also check subdirectories one level deep
          const dirs = contents.filter((item) => item.type === 'dir');
          for (const dir of dirs.slice(0, 10)) {
            // Limit to first 10 dirs
            try {
              const { data: subContents } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: dir.path,
                ref: branch,
              });

              if (Array.isArray(subContents)) {
                const subFiles = subContents
                  .filter((item) => item.type === 'file' && item.name.endsWith('.csproj'))
                  .map((item) => ({ name: item.name, path: item.path }));
                csprojFiles.push(...subFiles);
              }
            } catch {
              // Skip if can't read subdirectory
            }
          }
        }

        if (csprojFiles.length > 0) break; // Found some, stop searching
      } catch {
        // Path doesn't exist, continue to next
      }
    }

    if (csprojFiles.length === 0) {
      return [];
    }

    // Parse the first .csproj file found
    const firstCsproj = csprojFiles[0]!;
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: firstCsproj.path,
      ref: branch,
    });

    if (!('content' in fileData)) {
      return [];
    }

    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const dependencies: Dependency[] = [];

    // Parse PackageReference elements
    const packageRefRegex = /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g;
    let match;

    while ((match = packageRefRegex.exec(content)) !== null) {
      dependencies.push({
        name: match[1]!,
        version: match[2]!,
        ecosystem: 'nuget',
        isDirect: true,
      });
    }

    return dependencies;
  } catch (error) {
    console.error(`Error extracting NuGet dependencies for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Extract dependencies based on repository type
 */
export async function extractDependencies(
  octokit: Octokit,
  owner: string,
  repo: string,
  repositoryType: string,
  branch = 'main'
): Promise<Dependency[]> {
  switch (repositoryType) {
    case 'node-api':
    case 'react':
    case 'angular':
      return await extractNpmDependencies(octokit, owner, repo, branch);

    case 'csharp-api':
    case 'csharp-library':
      return await extractNuGetDependencies(octokit, owner, repo, branch);

    default:
      return [];
  }
}
