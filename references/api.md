# API 参考

所有接口都作用于**已连接的浏览器实例**：通过 `--browserUrl` 附着到用户已在运行的浏览器，因此登录态、Cookie、JS 渲染后的 DOM 原样保留。脚本不会自行导航、不会新开浏览器实例。

## `clonePage(options)`

克隆指定页面，产出静态 HTML 副本。目标页面须已由用户在浏览器中打开并完成登录。

### 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `options.pageId` | `number` | 浏览器标签页 ID | `null` |
| `options.url` | `string` | URL 关键词（子串匹配） | `null` |
| `options.output` | `string` | 输出目录 | `./page-clone-output` |
| `options.format` | `string` | `single` / `separate` | `single` |
| `options.port` | `number` | 浏览器调试端口 | `9222` |

`pageId` 与 `url` 均省略时，选取第一个非空白页。两者同时给出时，`url` 优先。

> `options.url` 是**在已打开的标签页中做子串匹配**，不是导航指令 —— 不会打开新页面。目标页未打开时匹配会失败。

### 返回值

`Promise<CloneResult>`

```typescript
interface CloneResult {
  outputDir: string;   // 输出目录绝对路径
  files: string[];     // 生成的文件的绝对路径
  metadata: {
    url: string;
    title: string;
    clonedAt: string;  // ISO 时间戳
    format: 'single' | 'separate';
    sizes: {
      html: number;    // 提取到的 HTML 字节数
      css: number;     // 提取到的 CSS 字节数
    };
  };
}
```

### 示例

```javascript
const { clonePage } = require('./scripts/clone.js');

const result = await clonePage({
  pageId: 8,
  output: './my-clone',
  format: 'single'
});

console.log(`Cloned to: ${result.outputDir}`);
console.log(`Files: ${result.files.join(', ')}`);
```

### 错误

| 错误信息 | 原因 | 处理 |
|----------|------|------|
| `No pages found in browser` | 浏览器无 http/https 标签页 | 先在浏览器中打开目标页面 |
| `未找到 ID 为 N 的页面` | pageId 不存在 | 先调用 `listPages` 确认 |
| `未找到 URL 包含 "x" 的页面` | url 关键词无匹配 | 放宽关键词，或改用 pageId |
| `未找到 chrome-devtools-mcp` | 依赖缺失 | `npm install chrome-devtools-mcp` |

---

## `listPages(options)`

列出浏览器中所有打开的标签页 —— 包括用户登录后打开的那些。

### 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `options.port` | `number` | 浏览器调试端口 | `9222` |

### 返回值

`Promise<PageInfo[]>`

```typescript
interface PageInfo {
  id: number;
  title: string;
  url: string;
}
```

仅包含 `http://` / `https://` 协议的页面，`about:blank`、`chrome://` 等内部页会被过滤。

### 示例

```javascript
const { listPages } = require('./scripts/clone.js');

const pages = await listPages({ port: 9222 });
pages.forEach(page => {
  console.log(`[${page.id}] ${page.title} - ${page.url}`);
});
```

---

## `parseArgs(argv)`

解析命令行参数。CLI 内部使用，同时对参数做校验。

```javascript
const { parseArgs } = require('./scripts/clone.js');

parseArgs(['--pageId', '8', '--format', 'separate']);
// { url: null, pageId: 8, output: './page-clone-output', port: 9222, format: 'separate' }
```

- 同时支持 `--key value` 与 `--key=value` 两种写法
- 未知参数被忽略并打印警告
- `pageId` / `port` 非数字、`format` 非 `single|separate` 时抛错

---

## `resolveMcpPath()`

定位 `chrome-devtools-mcp` 的入口文件。按以下顺序查找，返回第一个存在的路径：

1. 环境变量 `CHROME_DEVTOOLS_MCP_PATH`
2. 项目内 `node_modules/chrome-devtools-mcp`
3. 全局 `npm root -g` 下的 `chrome-devtools-mcp`
4. `~/AppData/Roaming/npm/node_modules/chrome-devtools-mcp`（Windows）
5. `/usr/local/lib/node_modules/chrome-devtools-mcp`（macOS / Linux）

全部未命中时抛出错误，提示安装依赖。

---

## MCP 服务器

```bash
node scripts/mcp-server.js
```

### 工具

#### `list_pages`

列出浏览器标签页。

**输入：**

```json
{
  "type": "object",
  "properties": {
    "port": { "type": "number", "default": 9222 }
  }
}
```

**输出示例：**

```
Found 2 pages:
[8] 模块详情 - https://124.70.184.162/projects/module
[12] 组件库 - https://124.70.184.162/components
```

#### `clone_page`

克隆指定页面。支持 `pageId` 或 `url` 定位。

**输入：**

```json
{
  "type": "object",
  "properties": {
    "pageId": { "type": "number" },
    "url": { "type": "string" },
    "output": { "type": "string", "default": "./page-clone-output" },
    "format": { "type": "string", "enum": ["single", "separate"], "default": "single" },
    "port": { "type": "number", "default": 9222 }
  }
}
```

#### `clone_by_url`

按 URL 关键词克隆，等价于 `clone_page` 但 `url` 必填。关键词在**已打开的标签页**中做子串匹配，不会导航到新页面。

---

## TypeScript

类型定义可从 JSDoc 推导，或手写如下：

```typescript
import { clonePage, listPages } from './scripts/clone.js';

const pages = await listPages({ port: 9222 });
const result = await clonePage({ pageId: pages[0].id });
```
