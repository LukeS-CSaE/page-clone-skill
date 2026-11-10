#!/usr/bin/env node
/**
 * Page Clone MCP Server
 * 将 page-clone skill 封装为 MCP 服务器
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.resolve(__dirname, '..');
const CLONE_SCRIPT = path.join(SKILL_DIR, 'scripts', 'clone.js');
const LIST_SCRIPT = path.join(SKILL_DIR, 'scripts', 'list-pages.js');

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'page-clone',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
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
              description: 'URL 关键词（如 "124.70.184.162" 或 "example.com"）',
            },
            output: {
              type: 'string',
              description: '输出目录路径',
              default: './page-clone-output',
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
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_pages': {
        const result = await runScript(LIST_SCRIPT, [
          '--port', String(args.port || 9222)
        ]);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'clone_page':
      case 'clone_by_url': {
        const scriptArgs = [];
        
        if (args.pageId) {
          scriptArgs.push('--pageId', String(args.pageId));
        }
        if (args.url) {
          scriptArgs.push('--url', args.url);
        }
        if (args.output) {
          scriptArgs.push('--output', args.output);
        }
        if (args.format) {
          scriptArgs.push('--format', args.format);
        }
        if (args.port) {
          scriptArgs.push('--port', String(args.port));
        }

        const result = await runScript(CLONE_SCRIPT, scriptArgs);
        
        // 读取元数据
        const metadataPath = path.join(args.output || './page-clone-output', 'metadata.json');
        let metadataText = '';
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          metadataText = '\n\n📋 Metadata:\n' + JSON.stringify(metadata, null, 2);
        }

        return {
          content: [
            {
              type: 'text',
              text: result + metadataText,
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

// 运行脚本的辅助函数
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      const s = data.toString();
      // 过滤掉非错误信息
      if (!s.includes('usage statistics') && !s.includes('exposes content')) {
        stderr += s;
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

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
