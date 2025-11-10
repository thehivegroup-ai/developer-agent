#!/usr/bin/env node
/**
 * Test Summary Script
 *
 * Runs all tests across workspaces and provides aggregated summary
 */

import { spawnSync } from 'node:child_process';
import chalk from 'chalk';

// Helper to pad strings that may contain ANSI color codes
function padString(str, length) {
  // Strip ANSI codes to get actual visible length
  // eslint-disable-next-line no-control-regex
  const stripped = str.replaceAll(/\u001b\[\d+m/g, '');
  const padding = ' '.repeat(Math.max(0, length - stripped.length));
  return str + padding;
}

console.log(chalk.bold.cyan('\n🧪 Running Tests Across All Workspaces...\n'));

const workspaces = [
  { name: 'Shared', path: 'shared' },
  { name: 'API Gateway', path: 'api-gateway' },
  { name: 'Developer Agent', path: 'developer-agent' },
  { name: 'GitHub Agent', path: 'github-agent' },
  { name: 'Repository Agents', path: 'repository-agents' },
  { name: 'Relationship Agent', path: 'relationship-agent' },
  { name: 'Frontend', path: 'frontend' },
];

const results = [];
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;
let totalDuration = 0;

const overallStartTime = Date.now();

for (const workspace of workspaces) {
  try {
    console.log(chalk.gray(`Running tests in ${workspace.name}...`));

    const startTime = Date.now();

    // Use JSON reporter for reliable parsing
    const result = spawnSync(
      'npm',
      ['test', '-w', workspace.path, '--', '--run', '--reporter=json'],
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: true,
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Parse JSON output
    const output = result.stdout || '';
    let testData;
    try {
      // Find the JSON output (look for testResults array)
      const jsonMatch = output.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
      if (jsonMatch) {
        testData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      // Fallback to text parsing if JSON fails
      console.log(
        chalk.yellow(
          `Warning: Could not parse JSON output for ${workspace.name}: ${parseError.message}`
        )
      );
      testData = null;
    }

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    if (testData && testData.testResults) {
      // Count from JSON
      for (const fileResult of testData.testResults) {
        for (const testResult of fileResult.assertionResults || []) {
          if (testResult.status === 'passed') passed++;
          else if (testResult.status === 'failed') failed++;
          else if (
            testResult.status === 'skipped' ||
            testResult.status === 'pending' ||
            testResult.status === 'todo'
          )
            skipped++;
        }
      }
    } else {
      // Fallback to text parsing
      const allOutput = output + (result.stderr || '');
      const testsLine = allOutput.match(/Tests\s+(\d+)\s+passed/);
      const failedMatch = allOutput.match(/(\d+)\s+failed/);
      const skippedMatch = allOutput.match(/(\d+)\s+skipped/);

      passed = testsLine ? Number.parseInt(testsLine[1], 10) : 0;
      failed = failedMatch ? Number.parseInt(failedMatch[1], 10) : 0;
      skipped = skippedMatch ? Number.parseInt(skippedMatch[1], 10) : 0;
    }

    results.push({
      name: workspace.name,
      passed,
      failed,
      skipped,
      duration,
      status: failed > 0 ? 'FAIL' : 'PASS',
    });

    totalPassed += passed;
    totalFailed += failed;
    totalSkipped += skipped;
    totalDuration += Number.parseFloat(duration);
  } catch (error) {
    // Test failed
    const result = error;
    const output = (result.stdout || '') + (result.stderr || '');
    const testsLine = output.match(/Tests\s+(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);
    const skippedMatch = output.match(/(\d+)\s+skipped/);

    const passed = testsLine ? Number.parseInt(testsLine[1], 10) : 0;
    const failed = failedMatch ? Number.parseInt(failedMatch[1], 10) : 0;
    const skipped = skippedMatch ? Number.parseInt(skippedMatch[1], 10) : 0;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    results.push({
      name: workspace.name,
      passed,
      failed,
      skipped,
      duration,
      status: 'FAIL',
    });

    totalPassed += passed;
    totalFailed += failed;
    totalSkipped += skipped;
    totalDuration += Number.parseFloat(duration);
  }
}

const overallDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);

// Print summary table
console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
console.log(
  chalk.bold(
    'Workspace'.padEnd(25) +
      'Passed'.padEnd(10) +
      'Failed'.padEnd(10) +
      'Skipped'.padEnd(10) +
      'Pass Rate'.padEnd(12) +
      'Time'.padEnd(10) +
      'Status'
  )
);
console.log('─'.repeat(100));

for (const result of results) {
  const statusColor = result.status === 'PASS' ? chalk.green : chalk.red;
  const passedStr = result.passed > 0 ? chalk.green(result.passed.toString()) : '0';
  const failedStr = result.failed > 0 ? chalk.red(result.failed.toString()) : '0';
  const skippedStr = result.skipped > 0 ? chalk.yellow(result.skipped.toString()) : '0';

  // Calculate pass rate: passed / (passed + failed), skipped don't count
  const executed = result.passed + result.failed;
  const passRate = executed > 0 ? ((result.passed / executed) * 100).toFixed(1) : '100.0';
  const passRateStr =
    result.failed === 0 ? chalk.green(passRate + '%') : chalk.yellow(passRate + '%');
  const timeStr = chalk.gray(result.duration + 's');

  console.log(
    result.name.padEnd(25) +
      padString(passedStr, 10) +
      padString(failedStr, 10) +
      padString(skippedStr, 10) +
      padString(passRateStr, 12) +
      padString(timeStr, 10) +
      statusColor(result.status)
  );
}

console.log('─'.repeat(100));

// Calculate overall pass rate: passed / (passed + failed), skipped don't count
const executedTotal = totalPassed + totalFailed;
const passRate = executedTotal > 0 ? ((totalPassed / executedTotal) * 100).toFixed(1) : '100.0';

console.log(
  chalk.bold('TOTAL'.padEnd(25)) +
    padString(chalk.green(totalPassed.toString()), 10) +
    padString(totalFailed > 0 ? chalk.red(totalFailed.toString()) : '0', 10) +
    padString(totalSkipped > 0 ? chalk.yellow(totalSkipped.toString()) : '0', 10) +
    padString(totalFailed === 0 ? chalk.green(passRate + '%') : chalk.yellow(passRate + '%'), 12) +
    padString(chalk.gray(overallDuration + 's'), 10) +
    (totalFailed === 0 ? chalk.green('✓ ALL PASS') : chalk.red('✗ FAILURES'))
);

console.log(
  chalk.bold(
    `\nPass Rate: ${totalFailed === 0 ? chalk.green(passRate + '%') : chalk.yellow(passRate + '%')}`
  )
);
console.log(
  chalk.bold(
    `Total Tests: ${executedTotal + totalSkipped} (${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped)`
  )
);
console.log(chalk.bold(`Total Time: ${overallDuration}s\n`));

// Exit with error if any tests failed
process.exit(totalFailed > 0 ? 1 : 0);
