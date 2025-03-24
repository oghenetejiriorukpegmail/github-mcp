# GitHub MCP Server Installation Script

# Check if running with administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Please run this script as Administrator"
    exit
}

# Configuration
$mcpDir = "$env:APPDATA\Roo-Code\MCP\github-mcp"
$mcpSettingsDir = "$env:APPDATA\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings"
$mcpSettingsFile = "$mcpSettingsDir\cline_mcp_settings.json"

# Create directories if they don't exist
Write-Host "Creating directories..."
New-Item -ItemType Directory -Force -Path $mcpDir | Out-Null
New-Item -ItemType Directory -Force -Path $mcpSettingsDir | Out-Null

# Copy files to MCP directory
Write-Host "Copying files..."
Copy-Item -Path "*" -Destination $mcpDir -Recurse -Force

# Install dependencies
Write-Host "Installing dependencies..."
Set-Location $mcpDir
npm install

# Build TypeScript code
Write-Host "Building TypeScript code..."
npm run build

# Get GitHub token from user
$githubToken = Read-Host "Enter your GitHub Personal Access Token"

# Create or update MCP settings
Write-Host "Configuring MCP settings..."
$mcpSettings = @{
    mcpServers = @{
        github = @{
            command = "node"
            args = @(
                "$mcpDir\build\index.js"
            )
            env = @{
                GITHUB_TOKEN = $githubToken
            }
            disabled = $false
            alwaysAllow = @()
        }
    }
}

# Convert to JSON and save
$mcpSettings | ConvertTo-Json -Depth 10 | Set-Content $mcpSettingsFile

Write-Host "Installation complete!"
Write-Host "Please restart VS Code to apply the changes."
