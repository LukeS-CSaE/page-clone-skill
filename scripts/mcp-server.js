#!/usr/bin/env node
/**
 * Page Clone MCP Server
 * 将 page-clone skill 封装为 MCP 服务器
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '..');

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'page-clone',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    }
  }
);

// 定义工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_pages',
        description: '列出浏览器中所有打开的标签页',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: '浏览器调试端口（默认 9222）',
              default: 9222,
            },
          },
        },
      },
      {
        name: 'clone_page',
        description: '克隆指定页面，生成 1:1 高保真静态 HTML',
        inputSchema: {
          type: 'object',
          properties: {
            pageId: {
              type: 'number',
              description: '浏览器标签页 ID（从 list_pages 获取）',
            },
            url: {
              type: 'string',
              description: 'URL 关键词（用于匹配页面）',
            },
            output: {
              type: 'string',
              description: '输出目录路径',
              default: './page-clone-output',
            },
            format: {
              type: 'string',
              enum: ['single', 'separate'],
              description: '输出格式：single=单文件，separate=HTML+CSS分离',
              default: 'single',
            },
            port: {
              type: 'number',
              description: '浏览器调试端口',
              default: 9222,
            },
          },
        },
      },
      {
        name: 'clone_by_url',
        description: '通过 URL 关键词克隆页面（便捷方法）',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL 关键词（如 "example.com"）',
            },
            output: {
              type: 'string',
              description: '输出目录路径',
              default: './page-clone-output',
            },
            format: {
              type: 'string',
              enum: ['single', 'separate'],
              description: '输出格式：single=单文件，separate=HTML+CSS分离',
              default: 'single',
            },
            port: {
              type: 'number',
              description: '浏览器调试端口',
              default: 9222,
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    // 延迟 require，避免模块加载期就建立 MCP 连接
    const { clonePage, listPages } = require('./clone.js');

    switch (name) {
      case 'list_pages': {
        const pages = await listPages({ port: args.port || 9222 });

        const lines = pages.map(p => `[${p.id}] ${p.title} - ${p.url}`);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${pages.length} pages:\n${lines.join('\n')}`,
            },
          ],
        };
      }

      case 'clone_page':
      case 'clone_by_url': {
        const result = await clonePage({
          pageId: args.pageId,
          url: args.url,
          output: args.output,
          format: args.format,
          port: args.port || 9222,
        });

        const metadataText = '\n\n📋 Metadata:\n' + JSON.stringify(result.metadata, null, 2);

        return {
          content: [
            {
              type: 'text',
              text: `✅ Clone complete!\nOutput: ${result.outputDir}\nFiles:\n${result.files.join('\n')}${metadataText}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Page Clone MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
