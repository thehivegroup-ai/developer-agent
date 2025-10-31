#!/usr/bin/env node

import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');

config({ path: resolve(projectRoot, '.env') });

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'A2A-Developer-Agent/1.0',
});

async function test() {
  try {
    console.log('Testing cortside/cortside.common on develop branch...\n');

    // Get root contents
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: 'cortside',
      repo: 'cortside.common',
      path: '',
      ref: 'develop',
    });

    console.log('Root directory contents:');
    if (Array.isArray(contents)) {
      contents.forEach((item) => {
        console.log(`  ${item.type === 'dir' ? '📁' : '📄'} ${item.name}`);
      });
    }

    console.log('\nLooking for .csproj files...');
    const csprojFiles = Array.isArray(contents)
      ? contents.filter((item) => item.name.endsWith('.csproj'))
      : [];

    console.log(`Found ${csprojFiles.length} .csproj files in root`);

    if (csprojFiles.length > 0) {
      console.log('\nFetching first .csproj content...');
      const firstCsproj = csprojFiles[0];
      const { data: fileData } = await octokit.rest.repos.getContent({
        owner: 'cortside',
        repo: 'cortside.common',
        path: firstCsproj.name,
        ref: 'develop',
      });

      if ('content' in fileData) {
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        console.log(`\nContent of ${firstCsproj.name}:\n`);
        console.log(content.substring(0, 500));
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
