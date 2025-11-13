#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verify all A2A agent servers are running and responding correctly.

.DESCRIPTION
    This script checks that all 4 agent servers (developer, github, repository, relationship)
    are running on their expected ports and responding to health checks and agent card requests.

.PARAMETER Timeout
    Timeout in seconds for each HTTP request (default: 10)

.EXAMPLE
    .\scripts\verify-agents.ps1
    
.EXAMPLE
    .\scripts\verify-agents.ps1 -Timeout 5
#>

param(
    [int]$Timeout = 10
)

$ErrorActionPreference = 'Stop'

# ANSI color codes
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

# Agent configurations
$agents = @(
    @{
        Name = "Developer Agent"
        Port = 3001
        ExpectedName = "Developer Agent"
    },
    @{
        Name = "GitHub Agent"
        Port = 3002
        ExpectedName = "GitHub Agent"
    },
    @{
        Name = "Repository Agent"
        Port = 3003
        ExpectedName = "Repository Agent"
    },
    @{
        Name = "Relationship Agent"
        Port = 3004
        ExpectedName = "Relationship Agent"
    }
)

Write-Host "${Cyan}========================================${Reset}"
Write-Host "${Cyan}A2A Agent Verification Script${Reset}"
Write-Host "${Cyan}========================================${Reset}"
Write-Host ""

$allPassed = $true
$results = @()

foreach ($agent in $agents) {
    Write-Host "${Cyan}Testing $($agent.Name) (Port $($agent.Port))...${Reset}"
    
    $agentResult = @{
        Name = $agent.Name
        Port = $agent.Port
        AgentCardTest = $false
        JsonRpcTest = $false
        Errors = @()
    }
    
    # Test 1: Agent Card Endpoint
    try {
        $agentCardUrl = "http://localhost:$($agent.Port)/.well-known/agent-card.json"
        $response = Invoke-RestMethod -Uri $agentCardUrl -TimeoutSec $Timeout -ErrorAction Stop
        
        # Verify response structure
        if ($response.name -and $response.protocolVersion -eq "0.3.0") {
            if ($response.name -eq $agent.ExpectedName) {
                Write-Host "  ${Green}✓${Reset} Agent Card endpoint working"
                Write-Host "    Name: $($response.name)"
                Write-Host "    Protocol: $($response.protocolVersion)"
                $agentResult.AgentCardTest = $true
            } else {
                Write-Host "  ${Yellow}⚠${Reset} Agent Card returned unexpected name: $($response.name)"
                $agentResult.Errors += "Unexpected agent name: $($response.name)"
            }
        } else {
            Write-Host "  ${Red}✗${Reset} Agent Card response invalid"
            $agentResult.Errors += "Invalid agent card structure"
            $allPassed = $false
        }
    } catch {
        Write-Host "  ${Red}✗${Reset} Agent Card endpoint failed: $($_.Exception.Message)"
        $agentResult.Errors += "Agent card failed: $($_.Exception.Message)"
        $allPassed = $false
    }
    
    # Test 2: JSON-RPC Endpoint
    try {
        $rpcUrl = "http://localhost:$($agent.Port)"
        $rpcBody = @{
            jsonrpc = "2.0"
            method = "message/send"
            params = @{
                message = @{
                    role = "user"
                    parts = @(
                        @{
                            type = "text"
                            text = "test"
                        }
                    )
                    messageId = "test-$(New-Guid)"
                }
            }
            id = 1
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri $rpcUrl -Method POST -Body $rpcBody -ContentType "application/json" -TimeoutSec $Timeout -ErrorAction Stop
        
        # Verify JSON-RPC response structure
        if ($response.jsonrpc -eq "2.0" -and ($response.result -or $response.error)) {
            Write-Host "  ${Green}✓${Reset} JSON-RPC endpoint responding"
            if ($response.error) {
                Write-Host "    ${Yellow}Note:${Reset} Server returned error: $($response.error.message)"
            }
            $agentResult.JsonRpcTest = $true
        } else {
            Write-Host "  ${Red}✗${Reset} JSON-RPC response invalid"
            $agentResult.Errors += "Invalid JSON-RPC response"
            $allPassed = $false
        }
    } catch {
        Write-Host "  ${Red}✗${Reset} JSON-RPC endpoint failed: $($_.Exception.Message)"
        $agentResult.Errors += "JSON-RPC failed: $($_.Exception.Message)"
        $allPassed = $false
    }
    
    Write-Host ""
    $results += $agentResult
}

# Summary
Write-Host "${Cyan}========================================${Reset}"
Write-Host "${Cyan}Verification Summary${Reset}"
Write-Host "${Cyan}========================================${Reset}"
Write-Host ""

$passedCount = ($results | Where-Object { $_.AgentCardTest -and $_.JsonRpcTest }).Count
$totalCount = $results.Count

Write-Host "Agents tested: $totalCount"
Write-Host "Agents passed: ${Green}$passedCount${Reset}"
Write-Host "Agents failed: $(if ($totalCount - $passedCount -gt 0) { "${Red}$($totalCount - $passedCount)${Reset}" } else { "${Green}0${Reset}" })"
Write-Host ""

if ($allPassed) {
    Write-Host "${Green}✓ All agents are working correctly!${Reset}"
    Write-Host ""
    Write-Host "All 4 A2A agent servers are running and responding to:"
    Write-Host "  • Agent Card endpoint (/.well-known/agent-card.json)"
    Write-Host "  • JSON-RPC 2.0 endpoint (POST /)"
    exit 0
} else {
    Write-Host "${Red}✗ Some agents failed verification${Reset}"
    Write-Host ""
    Write-Host "Failed agents:"
    foreach ($result in $results) {
        if (-not $result.AgentCardTest -or -not $result.JsonRpcTest) {
            Write-Host "  • $($result.Name) (Port $($result.Port))"
            foreach ($err in $result.Errors) {
                Write-Host "    - $err"
            }
        }
    }
    Write-Host ""
    Write-Host "Make sure all agents are started with:"
    Write-Host "  ${Cyan}npm run start:all${Reset}"
    exit 1
}
