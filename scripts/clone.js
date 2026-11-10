#!/usr/bin/env node
/**
 * Page Clone Script
 * 从浏览器标签页提取完整 HTML + CSS，生成 1:1 克隆
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============ 配置 ============
const CONFIG = {
  defaultPort: 9222,
  defaultOutput: './page-clone-output',
  defaultFormat: 'single'
};

/**
 * 解析 chrome-devtools-mcp 入口路径
 * 优先级：环境变量 > 本地 node_modules > 全局 node_modules
 * 避免写死某台机器的绝对路径
 */
function resolveMcpPath() {
  const candidates = [];

  if (process.env.CHROME_DEVTOOLS_MCP_PATH) {
    candidates.push(process.env.CHROME_DEVTOOLS_MCP_PATH);
  }

  // 本地依赖（项目内 node_modules）
  candidates.push(path.join(
    __dirname, '..', 'node_modules', 'chrome-devtools-mcp',
    'build', 'src', 'bin', 'chrome-devtools-mcp-main.js'
  ));

  // 全局依赖（npm root -g）
  try {
    const result = spawnSync('npm', ['root', '-g'], { encoding: 'utf8', shell: true });
    const npmRoot = (result.stdout || '').trim();
    if (npmRoot) {
      candidates.push(path.join(
        npmRoot, 'chrome-devtools-mcp',
        'build', 'src', 'bin', 'chrome-devtools-mcp-main.js'
      ));
    }
  } catch {
    // npm 不可用时忽略该候选
  }

  // 常见默认安装位置
  candidates.push(path.join(
    os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules',
    'chrome-devtools-mcp', 'build', 'src', 'bin', 'chrome-devtools-mcp-main.js'
  ));
  candidates.push(path.join(
    '/usr/local/lib/node_modules', 'chrome-devtools-mcp',
    'build', 'src', 'bin', 'chrome-devtools-mcp-main.js'
  ));

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    '未找到 chrome-devtools-mcp。请执行 `npm install chrome-devtools-mcp`，' +
    '或设置环境变量 CHROME_DEVTOOLS_MCP_PATH 指向其 main.js 入口。'
  );
}

// ============ 参数解析 ============
const SUPPORTED_ARGS = ['url', 'pageId', 'output', 'port', 'format'];

function parseArgs(argv = process.argv.slice(2)) {
  const config = {
    url: null,
    pageId: null,
    output: CONFIG.defaultOutput,
    port: CONFIG.defaultPort,
    format: CONFIG.defaultFormat
  };

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (!raw.startsWith('--')) continue;

    const eq = raw.indexOf('=');
    let key = eq === -1 ? raw.slice(2) : raw.slice(2, eq);
    let value = eq === -1 ? argv[i + 1] : raw.slice(eq + 1);

    if (eq === -1) {
      // 无值形式（--key=value）不消费下一个参数
      if (value === undefined || value.startsWith('--')) {
        value = undefined;
      } else {
        i++;
      }
    }

    if (!SUPPORTED_ARGS.includes(key)) {
      console.warn(`[warn] 忽略未知参数: --${key}`);
      continue;
    }

    if (value === undefined) {
      throw new Error(`参数 --${key} 缺少值`);
    }

    config[key] = value;
  }

  if (config.pageId !== null) {
    const pageId = parseInt(config.pageId, 10);
    if (Number.isNaN(pageId)) throw new Error(`--pageId 必须是数字，收到: ${config.pageId}`);
    config.pageId = pageId;
  }

  const port = parseInt(config.port, 10);
  if (Number.isNaN(port)) throw new Error(`--port 必须是数字，收到: ${config.port}`);
  config.port = port;

  if (!['single', 'separate'].includes(config.format)) {
    throw new Error(`--format 只能是 single 或 separate，收到: ${config.format}`);
  }

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
    const mcpPath = resolveMcpPath();

    return new Promise((resolve, reject) => {
      this.server = spawn('node', [
        mcpPath,
        '--browserUrl', `http://127.0.0.1:${this.port}`,
        '--no-usage-statistics'
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

    if (result.error) {
      throw new Error(`MCP initialize 失败: ${result.error.message}`);
    }
    return result.result?.serverInfo;
  }

  /** 调用工具并返回完整 content 数组（文本块 + 图片块） */
  async callToolRaw(name, args) {
    const result = await this.send({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args }
    });

    if (result.error) {
      throw new Error(`MCP 工具 ${name} 调用失败: ${result.error.message}`);
    }
    return result.result?.content || [];
  }

  /** 调用工具并返回首个文本块内容 */
  async callTool(name, args) {
    const content = await this.callToolRaw(name, args);
    const textBlock = content.find(c => c.type === 'text');
    return textBlock?.text || '';
  }

  async listPages() {
    const text = await this.callTool('list_pages', {});
    return this.parsePages(text);
  }

  /**
   * 解析 list_pages 文本输出
   * 实际格式：`${id}: ${title} (${url})`，标题可能含空格或括号
   */
  parsePages(text) {
    const pages = [];
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*(\d+):\s*(.*?)\s*\((.*?)\)\s*$/);
      if (!match) continue;

      const url = match[3];
      if (!/^https?:\/\//i.test(url)) continue;

      pages.push({
        id: parseInt(match[1], 10),
        title: match[2] || url,
        url
      });
    }
    return pages;
  }

  async evaluate(pageId, func, format = 'function') {
    return this.callTool('evaluate_script', { pageId, function: func, format });
  }

  /**
   * 截图。take_screenshot 返回的 content 中：
   * content[0] 是文本说明，图片（base64）位于 type === 'image' 的块中。
   */
  async screenshot(pageId, outputPath) {
    const content = await this.callToolRaw('take_screenshot', { pageId, format: 'png' });
    const image = content.find(c => c.type === 'image' && c.data);

    if (!image) {
      return false;
    }

    fs.writeFileSync(outputPath, Buffer.from(image.data, 'base64'));
    return true;
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
 * 优先级：--url 匹配 > --pageId > 第一个非空白页
 */
async function findTargetPage(client, config) {
  const pages = await client.listPages();
  console.log(`Found ${pages.length} pages`);

  if (pages.length === 0) {
    throw new Error('浏览器中没有可克隆的页面（未找到 http/https 标签页）');
  }

  if (config.url) {
    const target = pages.find(p => p.url.includes(config.url));
    if (target) {
      console.log(`Found page by URL: ${target.title}`);
      return target;
    }
    throw new Error(
      `未找到 URL 包含 "${config.url}" 的页面。` +
      `可用页面: ${pages.map(p => `[${p.id}] ${p.url}`).join(', ')}`
    );
  }

  if (config.pageId !== null) {
    const target = pages.find(p => p.id === config.pageId);
    if (target) {
      console.log(`Found page by ID: ${target.title}`);
      return target;
    }
    throw new Error(
      `未找到 ID 为 ${config.pageId} 的页面。` +
      `可用页面: ${pages.map(p => `[${p.id}] ${p.url}`).join(', ')}`
    );
  }

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
  return unwrapJSONString(result);
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
  return unwrapJSONString(result);
}

/**
 * evaluate_script 的返回值被 MCP 包在 ```json 代码块中，
 * 且字符串本身是 JSON 转义过的，需要还原。
 */
function unwrapJSONString(text) {
  if (!text) return '';

  // 取出 ```json ... ``` 块
  const blockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  let payload = blockMatch ? blockMatch[1] : text.trim();

  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed === 'string') return parsed;
    return payload;
  } catch {
    // 非合法 JSON，退回宽松清洗
  }

  const looseMatch = payload.match(/^"([\s\S]*)"$/);
  let html = looseMatch ? looseMatch[1] : payload;
  html = html.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/');
  return html;
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
<title>${escapeHTML(title)} - 1:1 Clone</title>
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
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)} - Clone</title>
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

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============ 主流程 ============
/**
 * 克隆页面（程序化入口）
 * @param {object} options
 * @param {number} [options.pageId]
 * @param {string} [options.url]
 * @param {string} [options.output]
 * @param {string} [options.format] single | separate
 * @param {number} [options.port]
 * @returns {Promise<{outputDir:string, files:string[], metadata:object}>}
 */
async function clonePage(options = {}) {
  const config = {
    url: options.url ?? null,
    pageId: options.pageId ?? null,
    output: options.output ?? CONFIG.defaultOutput,
    port: options.port ?? CONFIG.defaultPort,
    format: options.format ?? CONFIG.defaultFormat
  };

  if (config.pageId !== null) {
    const pageId = parseInt(config.pageId, 10);
    if (Number.isNaN(pageId)) throw new Error(`pageId 必须是数字，收到: ${options.pageId}`);
    config.pageId = pageId;
  }

  const client = new MCPClient(config.port);
  await client.connect();

  try {
    await client.initialize();

    const targetPage = await findTargetPage(client, config);

    if (!fs.existsSync(config.output)) {
      fs.mkdirSync(config.output, { recursive: true });
    }

    const outputDir = path.resolve(config.output);
    const files = [];

    // 截图
    const screenshotPath = path.join(config.output, 'screenshot.png');
    const hasScreenshot = await client.screenshot(targetPage.id, screenshotPath);
    if (hasScreenshot) {
      files.push(screenshotPath);
      console.log('📸 Screenshot saved');
    } else {
      console.log('⚠️  Screenshot skipped (未返回图片数据)');
    }

    // 提取内容
    const html = await extractHTML(client, targetPage.id);
    const css = await extractCSS(client, targetPage.id);

    console.log(`Extracted: HTML ${(html.length / 1024).toFixed(1)} KB, CSS ${(css.length / 1024).toFixed(1)} KB`);

    if (config.format === 'separate') {
      const sizes = generateSeparateFiles(html, css, targetPage.title, config.output);
      files.push(path.join(config.output, 'index.html'));
      files.push(path.join(config.output, 'styles.css'));
      console.log(`✅ Generated: index.html (${(sizes.html / 1024).toFixed(1)} KB), styles.css (${(sizes.css / 1024).toFixed(1)} KB)`);
    } else {
      const outputPath = path.join(config.output, 'clone.html');
      const size = generateSingleFile(html, css, targetPage.title, outputPath);
      files.push(outputPath);
      console.log(`✅ Generated: ${outputPath} (${(size / 1024).toFixed(1)} KB)`);
    }

    // 保存元数据
    const metadata = {
      url: targetPage.url,
      title: targetPage.title,
      clonedAt: new Date().toISOString(),
      format: config.format,
      sizes: { html: html.length, css: css.length }
    };
    const metadataPath = path.join(config.output, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    files.push(metadataPath);

    console.log('\n✨ Clone complete!');
    console.log(`Open: ${outputDir}`);

    return { outputDir, files, metadata };
  } finally {
    client.disconnect();
  }
}

/**
 * 列出浏览器页面（程序化入口）
 * @param {object} [options]
 * @param {number} [options.port]
 * @returns {Promise<Array<{id:number,title:string,url:string}>>}
 */
async function listPages(options = {}) {
  const port = options.port ?? CONFIG.defaultPort;
  const client = new MCPClient(port);
  await client.connect();

  try {
    await client.initialize();
    return await client.listPages();
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

async function main() {
  const argv = process.argv.slice(2);

  // 支持 `page-clone list` 与 `page-clone clone --pageId 8` 两种子命令写法
  const subcommand = argv.find(a => !a.startsWith('--'));
  const rest = subcommand ? argv.filter(a => a !== subcommand) : argv;

  if (subcommand === 'list') {
    await listCommand(parseArgs(rest));
    return;
  }

  if (subcommand === 'clone') {
    await cloneCommand(parseArgs(rest));
    return;
  }

  if (subcommand) {
    console.error(`❌ 未知子命令: ${subcommand}`);
    console.error('可用子命令: list, clone');
    process.exit(1);
  }

  // 无子命令时保持原有行为：直接克隆
  await cloneCommand(parseArgs(argv));
}

async function cloneCommand(config) {
  console.log('🔍 Page Clone Tool');
  console.log('==================');
  console.log(`Port: ${config.port}`);
  console.log(`Output: ${config.output}`);
  console.log(`Format: ${config.format}`);
  console.log('');

  console.log('Connecting to browser...');
  await clonePage(config);
}

async function listCommand(config) {
  console.log('🔍 Listing browser pages...\n');

  const pages = await listPages({ port: config.port });

  console.log(`Found ${pages.length} pages:\n`);
  console.log('ID  | Title                                      | URL');
  console.log('----+--------------------------------------------+--------------------------------');

  for (const page of pages) {
    const title = page.title.slice(0, 40).padEnd(40);
    const url = page.url.slice(0, 50);
    console.log(`${String(page.id).padEnd(3)} | ${title} | ${url}`);
  }
}

module.exports = {
  clonePage,
  listPages,
  MCPClient,
  findTargetPage,
  extractHTML,
  extractCSS,
  parseArgs,
  resolveMcpPath
};
