#!/usr/bin/env node
/**
 * Page Clone Script
 * 从浏览器标签页提取完整 HTML + CSS，生成 1:1 克隆
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const CONFIG = {
  mcpPath: 'C:/Users/Ai107/AppData/Roaming/npm/node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp-main.js',
  defaultPort: 9222,
  defaultOutput: './page-clone-output',
  defaultFormat: 'single'
};

// ============ 参数解析 ============
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: null,
    pageId: null,
    output: CONFIG.defaultOutput,
    port: CONFIG.defaultPort,
    format: CONFIG.defaultFormat
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    if (key in config) config[key] = value;
  }

  // 转换类型
  if (config.pageId) config.pageId = parseInt(config.pageId);
  if (config.port) config.port = parseInt(config.port);

  return config;
}

// ============ MCP 客户端 ============
class MCPClient {
  constructor(port) {
    this.server = null;
    this.buffer = '';
    this.pending = new Map();
    this.msgId = 0;
    this.port = port;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', [
        CONFIG.mcpPath,
        '--browserUrl', `http://127.0.0.1:${this.port}`,
        '--usageStatistics=false'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' }
      });

      this.server.stdout.on('data', (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id && this.pending.has(msg.id)) {
              this.pending.get(msg.id)(msg);
              this.pending.delete(msg.id);
            }
          } catch {}
        }
      });

      this.server.stderr.on('data', (d) => {
        const s = d.toString();
        // 过滤掉非错误信息
        if (!s.includes('usage statistics') && !s.includes('exposes content') && 
            !s.includes('fetch failed') && !s.includes('ConnectTimeoutError')) {
          console.error('[MCP]', s.slice(0, 200));
        }
      });

      this.server.on('error', reject);
      this.server.on('spawn', resolve);
    });
  }

  send(msg) {
    return new Promise((resolve) => {
      const id = ++this.msgId;
      this.pending.set(id, resolve);
      this.server.stdin.write(JSON.stringify({ ...msg, id }) + '\n');
    });
  }

  async initialize() {
    const result = await this.send({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'page-clone', version: '1.0.0' }
      }
    });
    return result.result?.serverInfo;
  }

  async callTool(name, args) {
    const result = await this.send({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args }
    });
    return result.result?.content?.[0];
  }

  async listPages() {
    const content = await this.callTool('list_pages', {});
    return this.parsePages(content?.text || '');
  }

  parsePages(text) {
    const pages = [];
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.match(/(\d+):\s+(.+?)\s+\((https?:\/\/[^)]+)\)/);
      if (match) {
        pages.push({
          id: parseInt(match[1]),
          title: match[2],
          url: match[3]
        });
      }
    }
    return pages;
  }

  async evaluate(pageId, func, format = 'function') {
    const content = await this.callTool('evaluate_script', {
      pageId,
      function: func,
      format
    });
    return content?.text || '';
  }

  async screenshot(pageId, outputPath) {
    const content = await this.callTool('take_screenshot', { pageId });
    if (content?.data) {
      fs.writeFileSync(outputPath, Buffer.from(content.data, 'base64'));
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.server) {
      this.server.kill();
      this.server = null;
    }
  }
}

// ============ 核心功能 ============

/**
 * 查找目标页面
 */
async function findTargetPage(client, config) {
  const pages = await client.listPages();
  console.log(`Found ${pages.length} pages`);

  if (pages.length === 0) {
    throw new Error('No pages found in browser');
  }

  // 如果指定了 URL，匹配 URL
  if (config.url) {
    const target = pages.find(p => p.url.includes(config.url));
    if (target) {
      console.log(`Found page by URL: ${target.title}`);
      return target;
    }
  }

  // 如果指定了 pageId，直接使用
  if (config.pageId) {
    const target = pages.find(p => p.id === config.pageId);
    if (target) {
      console.log(`Found page by ID: ${target.title}`);
      return target;
    }
  }

  // 默认选择第一个非空页面
  const target = pages.find(p => !p.url.includes('about:blank')) || pages[0];
  console.log(`Using first non-blank page: ${target.title}`);
  return target;
}

/**
 * 提取页面 HTML
 */
async function extractHTML(client, pageId) {
  console.log('Extracting HTML...');
  const result = await client.evaluate(pageId, '() => document.documentElement.outerHTML');
  
  // 清理 MCP 返回的 JSON 包装
  let html = result;
  const jsonMatch = result.match(/"([\s\S]*)"/);
  if (jsonMatch) {
    html = jsonMatch[1];
  }
  html = html.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/');
  
  return html;
}

/**
 * 提取页面 CSS
 */
async function extractCSS(client, pageId) {
  console.log('Extracting CSS...');
  const cssScript = `() => {
    let css = '';
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          css += rule.cssText + '\\n';
        }
      } catch(e) {
        css += '/* External: ' + sheet.href + ' */\\n';
      }
    }
    return css;
  }`;
  
  const result = await client.evaluate(pageId, cssScript);
  
  // 清理
  let css = result;
  const jsonMatch = result.match(/"([\s\S]*)"/);
  if (jsonMatch) {
    css = jsonMatch[1];
  }
  css = css.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  
  return css;
}

/**
 * 生成独立 HTML 文件
 */
function generateSingleFile(html, css, title, outputPath) {
  const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - 1:1 Clone</title>
<style>
${css}
</style>
</head>
<body>
${html}
</body>
</html>`;

  fs.writeFileSync(outputPath, fullHTML);
  return fullHTML.length;
}

/**
 * 生成分离的 HTML + CSS
 */
function generateSeparateFiles(html, css, title, outputDir) {
  // HTML
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - Clone</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${html}
</body>
</html>`;
  
  fs.writeFileSync(path.join(outputDir, 'index.html'), htmlContent);
  fs.writeFileSync(path.join(outputDir, 'styles.css'), css);
  
  return { html: htmlContent.length, css: css.length };
}

// ============ 主流程 ============
async function main() {
  const config = parseArgs();
  
  console.log('🔍 Page Clone Tool');
  console.log('==================');
  console.log(`Port: ${config.port}`);
  console.log(`Output: ${config.output}`);
  console.log(`Format: ${config.format}`);
  console.log('');

  // 连接 MCP
  console.log('Connecting to browser...');
  const client = new MCPClient(config.port);
  await client.connect();
  
  try {
    await client.initialize();
    console.log('✅ Connected\n');

    // 查找目标页面
    const targetPage = await findTargetPage(client, config);
    console.log(`Target: ${targetPage.title}`);
    console.log(`URL: ${targetPage.url}\n`);

    // 创建输出目录
    if (!fs.existsSync(config.output)) {
      fs.mkdirSync(config.output, { recursive: true });
    }

    // 截图
    const screenshotPath = path.join(config.output, 'screenshot.png');
    await client.screenshot(targetPage.id, screenshotPath);
    console.log('📸 Screenshot saved\n');

    // 提取内容
    const html = await extractHTML(client, targetPage.id);
    const css = await extractCSS(client, targetPage.id);

    console.log(`Extracted: HTML ${(html.length / 1024).toFixed(1)} KB, CSS ${(css.length / 1024).toFixed(1)} KB\n`);

    // 生成输出
    if (config.format === 'single') {
      const outputPath = path.join(config.output, 'clone.html');
      const size = generateSingleFile(html, css, targetPage.title, outputPath);
      console.log(`✅ Generated: ${outputPath} (${(size / 1024).toFixed(1)} KB)`);
    } else if (config.format === 'separate') {
      const sizes = generateSeparateFiles(html, css, targetPage.title, config.output);
      console.log(`✅ Generated: index.html (${(sizes.html / 1024).toFixed(1)} KB), styles.css (${(sizes.css / 1024).toFixed(1)} KB)`);
    }

    // 保存元数据
    const metadata = {
      url: targetPage.url,
      title: targetPage.title,
      clonedAt: new Date().toISOString(),
      sizes: { html: html.length, css: css.length }
    };
    fs.writeFileSync(path.join(config.output, 'metadata.json'), JSON.stringify(metadata, null, 2));

    console.log('\n✨ Clone complete!');
    console.log(`Open: ${path.resolve(config.output)}`);

  } finally {
    client.disconnect();
  }
}

// 运行
if (require.main === module) {
  main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

module.exports = { MCPClient, findTargetPage, extractHTML, extractCSS };
