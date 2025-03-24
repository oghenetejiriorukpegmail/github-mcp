# GitHub MCP Server

A Model Context Protocol (MCP) server implementation for GitHub integration. This server provides tools for interacting with GitHub's API through the MCP protocol.

## Features

- Create GitHub repositories
- Push content to repositories
- Get user information
- Proper error handling and TypeScript type safety
- Automatic installation script

## Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)
- PowerShell (for Windows installation)
- GitHub Personal Access Token with repo scope

## Installation

### Windows

1. Clone this repository:
```powershell
git clone https://github.com/oghenetejiriorukpegmail/github-mcp.git
```

2. Run the installation script:
```powershell
.\install.ps1
```

The script will:
- Create the necessary directories
- Install dependencies
- Build the TypeScript code
- Configure the MCP settings

### Manual Installation

1. Create the MCP directory:
```powershell
mkdir -p "$env:APPDATA\Roo-Code\MCP\github-mcp"
```

2. Clone this repository into that directory:
```powershell
git clone https://github.com/oghenetejiriorukpegmail/github-mcp.git "$env:APPDATA\Roo-Code\MCP\github-mcp"
```

3. Install dependencies:
```powershell
cd "$env:APPDATA\Roo-Code\MCP\github-mcp"
npm install
```

4. Build the TypeScript code:
```powershell
npm run build
```

5. Add the server configuration to your MCP settings file at:
`%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "%APPDATA%\Roo-Code\MCP\github-mcp\build\index.js"
      ],
      "env": {
        "GITHUB_TOKEN": "your-github-token-here"
      },
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Available Tools

### get_user
Get GitHub user information.

```json
{
  "username": "octocat"
}
```

### create_repo
Create a new GitHub repository.

```json
{
  "repo_name": "my-new-repo",
  "description": "A new repository",
  "private": false
}
```

### push_to_repo
Push content to a GitHub repository.

```json
{
  "repo_name": "my-repo",
  "file_path": "docs/README.md",
  "content": "# My Project\nThis is a test file.",
  "message": "Add README file"
}
```

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Make changes to `src/index.ts`
4. Build: `npm run build`
5. Test your changes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
