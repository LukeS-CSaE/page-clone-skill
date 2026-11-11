# Page Clone

> 接管用户已登录、已打开的浏览器页面，提取渲染后的真实 HTML + CSS，生成 1:1 高保真静态页面克隆

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://gitee.com/moresecleft/page-clone-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.19.0-green.svg)](https://nodejs.org/)

## ✨ 特性

- 🔐 **专攻登录态页面** — 复用浏览器已认证的会话，curl / requests 拿不到的页面它能拿到
- 🎯 **1:1 高保真克隆** — 完整保留 HTML 结构 + CSS 样式
- 🔍 **智能页面识别** — 支持 URL 关键词匹配、页面 ID 定位
- 📦 **多种输出格式** — 单文件内联 CSS / HTML+CSS 分离
- 🤖 **MCP 服务器模式** — 可作为 MCP 工具集成到 AI Agent
- 🖥️ **跨浏览器支持** — Chrome、Edge、Tabbit 等 Chromium 浏览器

## 🎯 典型场景

| 场景 | 为什么不用命令行 |
|------|-----------------|
| 内部系统 / 管理后台 | 需要账号密码、SSO、验证码，命令行只会拿到登录页 |
| JS 动态渲染的 SPA | 原始 HTML 里没有数据，要拿到渲染后的 DOM |
| 登录后才可见的数据 | 同一 URL 不同身份内容不同，必须带着会话去取 |
| 线上页面转本地原型 | 要的是渲染后的真实视觉，不是源码 |

工作方式是**人机协作**：你在浏览器里人工登录并打开目标页面，脚本接管这个已登录的浏览器完成抓取。账号密码、验证码始终由你自己操作，工具不接触任何凭据。

## 📦 安装

```bash
# 本地安装
git clone https://gitee.com/moresecleft/page-clone-skill.git
cd page-clone-skill
npm install

# 或作为 Skill 使用
cp -r page-clone-skill ~/.workbuddy/skills/page-clone
```

## 🚀 快速开始

### 1. 开启浏览器调试端口

**Chrome / Edge：**

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-clone-profile"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-clone-profile"
```

需**完全退出**浏览器进程再重启，已运行的实例不会接受新参数。

> **Chrome 136+**：出于 Cookie 安全考虑，`--remote-debugging-port` 在默认用户目录上会被静默忽略，必须配 `--user-data-dir` 指向独立目录。好处是登录态独立保存 —— **登录一次，后续长期复用**。

**Tabbit：** 默认自动开启；若未开启，重启时加上同一参数。

### 2. 登录并打开目标页面

在刚启动的这个浏览器里完成登录（账号密码、SSO、验证码、扫码都由你亲自操作），然后导航到目标页面，等内容完全加载：骨架屏消失、表格数据渲染完毕。

这一步没做完就执行克隆，抓到的是登录页或空骨架。

### 3. 列出页面

```bash
node scripts/list-pages.js --port 9222
```

```
ID  | Title        | URL
----+--------------+--------------------------------
1   | 示例页面      | https://example.com
8   | 模块详情      | https://124.70.184.162/projects/module
```

### 4. 克隆页面

```bash
# 按页面 ID
node scripts/clone.js --pageId 8 --output ./my-clone

# 通过 URL 关键词
node scripts/clone.js --url "example.com" --output ./example-clone

# HTML + CSS 分离格式
node scripts/clone.js --pageId 8 --format separate --output ./my-clone

# 也支持子命令形式
node scripts/clone.js clone --pageId 8 --output ./my-clone
node scripts/clone.js list
```

### 5. 查看结果

```bash
open ./my-clone/clone.html        # macOS
start ./my-clone/clone.html       # Windows
```

## 📖 使用指南

### CLI 命令

| 命令 | 说明 |
|------|------|
| `node scripts/list-pages.js` | 列出浏览器中所有打开的标签页 |
| `node scripts/clone.js` | 克隆页面 |

#### 克隆参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `--pageId` | number | 浏览器标签页 ID | 第一个非空白页 |
| `--url` | string | URL 关键词（子串匹配） | - |
| `--output` | string | 输出目录 | `./page-clone-output` |
| `--format` | string | 输出格式 (`single`/`separate`) | `single` |
| `--port` | number | 调试端口 | `9222` |

### MCP 服务器模式

```bash
node scripts/mcp-server.js
```

**MCP 工具：**

- `list_pages` — 列出浏览器页面
- `clone_page` — 克隆页面（支持 pageId 或 URL）
- `clone_by_url` — 通过 URL 快速克隆

**客户端配置示例：**

```json
{
  "mcpServers": {
    "page-clone": {
      "command": "node",
      "args": ["/absolute/path/to/page-clone-skill/scripts/mcp-server.js"]
    }
  }
}
```

更多客户端（WorkBuddy / Claude Code / Cursor / VS Code）的接入方式见 [references/mcp-config.md](references/mcp-config.md)。

## 📂 输出结构

### `single` 格式（默认）

```
output/
├── clone.html          # 独立 HTML 文件（CSS 内联）
├── screenshot.png      # 页面截图
└── metadata.json       # 元数据（URL、时间、格式、大小）
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
  "format": "single",
  "sizes": {
    "html": 247155,
    "css": 782130
  }
}
```

## 🔧 高级用法

### 作为模块使用

```javascript
const { clonePage, listPages } = require('./scripts/clone.js');

// 列出页面
const pages = await listPages({ port: 9222 });

// 克隆页面
const result = await clonePage({
  pageId: pages[0].id,
  output: './my-clone',
  format: 'single'
});

console.log(result.outputDir, result.files);
```

### 批量克隆

`url` 是**在已打开的标签页里做子串匹配**，脚本不会自己导航。所以批量克隆的前提是：这些页面都已在浏览器中打开（登录完成、内容加载完毕）。

```javascript
const { clonePage } = require('./scripts/clone.js');

const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
];

for (const url of urls) {
  try {
    await clonePage({ url, output: `./clones/${new URL(url).pathname.split('/').pop()}` });
    console.log(`✅ ${url} cloned`);
  } catch (error) {
    console.error(`❌ Failed to clone ${url}:`, error.message);
  }
}
```

完整 API 说明见 [references/api.md](references/api.md)。

## ⚠️ 已知限制

- **只产出静态快照**：不含交互状态，动态内容需在页面完全加载后克隆
- **产物含敏感数据**：克隆的是登录后的真实业务数据（用户名、订单、内部指标等），输出目录按敏感文件对待，不要提交到公开仓库
- **登录态不写入产物**：Cookie / token / Session 不在 HTML 中，离线打开克隆页不会自动处于登录态
- **跨域样式表无法读取**：跨源 CSS 受同源策略限制，输出中会留 `/* External: ... */` 占位注释，需联网打开或手动补全（内部系统多为同源，通常不受影响）
- **图片不内联**：`<img>` 仍指向原图地址，离线打开时图片缺失

## 🐛 故障排除

| 现象 | 解决 |
|------|------|
| `Found 0 pages` / 连接失败 | 浏览器未开调试端口，完全退出后带 `--remote-debugging-port=9222 --user-data-dir="<独立目录>"` 重启 |
| 端口连不上（Chrome 136+） | 必须加 `--user-data-dir="<独立目录>"`，默认用户目录上该参数会被忽略 |
| 抓到的是登录页 | 目标页未打开 / 未加载完 / 会话过期，先在浏览器里确认页面内容完整 |
| `未找到 ID 为 N 的页面` | 标签页 ID 已失效，重新执行 `list-pages.js` 确认 |
| `未找到 chrome-devtools-mcp` | `npm install chrome-devtools-mcp` |
| CSS 明显缺失 | 跨源样式表限制，见上方「已知限制」 |

完整排查步骤见 [references/troubleshooting.md](references/troubleshooting.md)。

## 📚 文档结构

| 路径 | 内容 |
|------|------|
| `SKILL.md` | Skill 定义与执行流程 |
| `references/api.md` | 程序化 API、MCP 工具 schema、错误处理 |
| `references/mcp-config.md` | MCP 客户端接入配置 |
| `references/troubleshooting.md` | 故障排查手册 |
| `examples/basic-usage.js` | 基础使用示例 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！开发流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

[MIT License](LICENSE)

## 🔗 相关链接

- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)

