#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // provided by MCP config
if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN environment variable is required');
}

interface GithubToolArguments {
  username?: string;
  repo_name?: string;
  description?: string;
  private?: boolean;
  file_path?: string;
  content?: string;
  message?: string;
}

class GithubServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'github-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));

    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [],
      })
    );

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Invalid URI format: ${request.params.uri}`
        );
      }
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_user',
          description: 'Get GitHub user information',
          inputSchema: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'GitHub username',
              },
            },
            required: ['username'],
          },
        },
        {
          name: 'create_repo',
          description: 'Create a new GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              repo_name: {
                type: 'string',
                description: 'The name of the repository to create',
              },
              description: {
                type: 'string',
                description: 'A description of the repository',
              },
              private: {
                type: 'boolean',
                description: 'Whether the repository should be private',
                default: false,
              },
            },
            required: ['repo_name'],
          },
        },
        {
          name: 'push_to_repo',
          description: 'Push content to a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              repo_name: {
                type: 'string',
                description: 'The name of the repository to push to',
              },
              file_path: {
                type: 'string',
                description: 'The path where the file should be created in the repository',
              },
              content: {
                type: 'string',
                description: 'The content to push to the repository',
              },
              message: {
                type: 'string',
                description: 'The commit message',
                default: 'Update via GitHub MCP',
              },
            },
            required: ['repo_name', 'file_path', 'content'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments as GithubToolArguments;

      if (request.params.name === 'get_user') {
        const username = args.username;
        if (!username) {
          throw new McpError(ErrorCode.InvalidParams, 'Username is required');
        }

        try {
          const response = await this.axiosInstance.get(`/users/${username}`);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return {
              content: [
                {
                  type: 'text',
                  text: `GitHub API error: ${
                    error.response?.data.message ?? error.message
                  }`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }
      } else if (request.params.name === 'create_repo') {
        const repo_name = args.repo_name;
        if (!repo_name) {
          throw new McpError(ErrorCode.InvalidParams, 'Repository name is required');
        }

        try {
          const response = await this.axiosInstance.post('/user/repos', {
            name: repo_name,
            description: args.description,
            private: args.private ?? false,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return {
              content: [
                {
                  type: 'text',
                  text: `GitHub API error: ${
                    error.response?.data.message ?? error.message
                  }`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }
      } else if (request.params.name === 'push_to_repo') {
        const repo_name = args.repo_name;
        const file_path = args.file_path;
        const content = args.content;
        if (!repo_name || !file_path || !content) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Repository name, file path, and content are required'
          );
        }

        try {
          // Get the authenticated user's information
          const userResponse = await this.axiosInstance.get('/user');
          const username = userResponse.data.login;

          // Check if the file already exists
          let sha: string | undefined;
          try {
            const fileResponse = await this.axiosInstance.get(
              `/repos/${username}/${repo_name}/contents/${file_path}`
            );
            sha = fileResponse.data.sha;
          } catch (error) {
            // File doesn't exist, which is fine
          }

          // Create or update the file in the repository
          const response = await this.axiosInstance.put(
            `/repos/${username}/${repo_name}/contents/${file_path}`,
            {
              message: args.message ?? 'Update via GitHub MCP',
              content: Buffer.from(content).toString('base64'),
              sha: sha, // Include sha if updating an existing file
            }
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            return {
              content: [
                {
                  type: 'text',
                  text: `GitHub API error: ${
                    error.response?.data.message ?? error.message
                  }`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Github MCP server running on stdio');
  }
}

const server = new GithubServer();
server.run().catch(console.error);
