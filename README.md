# Page Clone Skill

> 从浏览器标签页提取完整 HTML + CSS，生成 1:1 高保真静态页面克隆

[![npm version](https://img.shields.io/npm/v/@moresec/page-clone-skill.svg)](https://www.npmjs.com/package/@moresec/page-clone-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- 🎯 **1:1 高保真克隆** - 完整保留 HTML 结构 + CSS 样式
- 🔍 **智能页面识别** - 支持 URL 匹配、页面 ID、自动检测
- 📦 **多种输出格式** - 单文件、分离 HTML/CSS、组件级拆分
- 🤖 **MCP 服务器** - 可作为 MCP 工具集成到 AI Agent
- 🖥️ **跨浏览器支持** - Chrome、Edge、Tabbit 等 Chromium 浏览器
- ⚡ **零配置启动** - 自动连接调试端口，一键克隆

## 📦 安装

### 全局安装（推荐）

```bash
npm install -g @moresec/page-clone-skill
```

### 本地安装

```bash
git clone https://gitee.com/moresecleft/page-clone-skill.git
cd page-clone-skill
npm install
```

## 🚀 快速开始

### 1. 开启浏览器调试端口

**Chrome:**
```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Tabbit:**
Tabbit 默认自动开启调试端口（如未开启，重启时添加 `--remote-debugging-port=9222`）

### 2. 克隆页面

```bash
# 列出所有打开的页面
page-clone list

# 克隆指定页面
page-clone clone --pageId 8 --output ./my-clone

# 通过 URL 关键词克隆
page-clone clone --url "example.com" --output ./example-clone

# 生成 HTML + CSS 分离格式
page-clone clone --pageId 8 --format separate
```

### 3. 查看结果

```bash
# 打开克隆的页面
open ./my-clone/clone.html        # macOS
start ./my-clone/clone.html       # Windows
```

## 📖 使用指南

### CLI 命令

#### `page-clone list`

列出浏览器中所有打开的标签页。

```bash
$ page-clone list --port 9222

🔍 Listing browser pages...

Found 5 pages:

ID  | Title        | URL
----+--------------+--------------------------------
1   | 示例页面      | https://example.com
2   | GitHub       | https://github.com
8   | 模块详情      | https://124.70.184.162/projects/module
...
```

#### `page-clone clone`

克隆指定页面。

**参数：**

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `--pageId` | number | 浏览器标签页 ID | - |
| `--url` | string | URL 关键词（部分匹配） | - |
| `--output` | string | 输出目录 | `./page-clone-output` |
| `--format` | string | 输出格式 (`single`/`separate`) | `single` |
| `--port` | number | 调试端口 | `9222` |

**示例：**

```bash
# 按页面 ID 克隆
page-clone clone --pageId 8 --output ./sca-clone

# 按 URL 关键词克隆
page-clone clone --url "124.70.184.162" --output ./module-clone

# 生成 HTML + CSS 分离格式
page-clone clone --pageId 8 --format separate --output ./separate-clone
```

### MCP 服务器模式

作为 MCP 服务器运行，供 AI Agent 调用：

```bash
page-clone mcp
```

或使用 npm script：

```bash
npm run mcp
```

**MCP 工具：**

- `list_pages` - 列出浏览器页面
- `clone_page` - 克隆页面（支持 pageId 或 URL）
- `clone_by_url` - 通过 URL 快速克隆

**DSH 配置示例：**

```yaml
# ~/.dsh/profiles/desktop/cordis.patch.yml
- id: mcp-page-clone
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: page-clone
    transport: stdio
    command: node
    args:
      - "C:\\path\\to\\page-clone-skill\\scripts\\mcp-server.js"
```

## 📂 输出结构

### `single` 格式（默认）

```
output/
├── clone.html          # 独立 HTML 文件（CSS 内联）
├── screenshot.png      # 页面截图
└── metadata.json       # 元数据（URL、时间、大小）
```

### `separate` 格式

```
output/
├── index.html          # HTML 文件
├── styles.css          # CSS 文件
├── screenshot.png
└── metadata.json
```

**metadata.json 示例：**

```json
{
  "url": "https://example.com/page",
  "title": "示例页面",
  "clonedAt": "2026-01-10T03:31:51.569Z",
  "sizes": {
    "html": 247155,
    "css": 782130
  }
}
```

## 🔧 高级用法

### 作为模块使用

```javascript
const { clonePage, listPages } = require('@moresec/page-clone-skill');

// 列出页面
const pages = await listPages({ port: 9222 });
console.log(pages);

// 克隆页面
const result = await clonePage({
  pageId: 8,
  output: './my-clone',
  format: 'single'
});
console.log(result);
```

### 批量克隆

创建 `batch-clone.js`:

```javascript
const { clonePage } = require('@moresec/page-clone-skill');

const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
];

for (const url of urls) {
  console.log(`Cloning ${url}...`);
  await clonePage({ url, output: `./clones/${url.split('/').pop()}` });
}
```

## 🐛 故障排除

### 调试端口未开启

**错误信息：** `Connection refused`

**解决方案：**

1. 完全退出浏览器
2. 使用 `--remote-debugging-port=9222` 参数重启
3. 验证端口是否开启：

```bash
curl http://127.0.0.1:9222/json/version
```

### 页面未找到

**错误信息：** `Target page not found`

**解决方案：**

1. 使用 `page-clone list` 查看所有页面
2. 确认页面 ID 或 URL 是否正确
3. 确保页面已完全加载

### 跨域 CSS 提取失败

**现象：** 部分样式缺失

**原因：** 外部样式表因 CORS 限制无法直接读取

**解决方案：**

脚本会自动尝试多种方法：
1. 使用 CDP 获取样式内容
2. 下载外部 CSS 文件
3. 提示手动下载

## 📚 API 文档

### `clonePage(options)`

克隆页面。

**参数：**

- `options.pageId` (number) - 页面 ID
- `options.url` (string) - URL 关键词
- `options.output` (string) - 输出目录
- `options.format` (string) - 输出格式
- `options.port` (number) - 调试端口

**返回值：** Promise\<CloneResult\>

```typescript
interface CloneResult {
  outputDir: string;
  files: string[];
  metadata: {
    url: string;
    title: string;
    clonedAt: string;
    sizes: { html: number; css: number };
  };
}
```

### `listPages(options)`

列出浏览器页面。

**参数：**

- `options.port` (number) - 调试端口

**返回值：** Promise\<PageInfo[]\>

```typescript
interface PageInfo {
  id: number;
  title: string;
  url: string;
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

```bash
# 克隆仓库
git clone https://gitee.com/moresecleft/page-clone-skill.git

# 安装依赖
npm install

# 运行测试
npm test
```

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [DeepSeek Harness](https://github.com/deepseek-ai/dsh)

---

**Made with ❤️ by MoreSec**
