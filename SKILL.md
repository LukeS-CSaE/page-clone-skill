---
name: page-clone
description: 接管已开启调试端口的浏览器，提取当前已打开页面的完整 HTML 与 CSS，生成 1:1 高保真静态页面克隆（单文件或 HTML+CSS 分离），附带整页截图与元数据。核心场景是命令行工具无法黑箱抓取的页面——需要账号登录、SSO 单点登录、验证码或多因子认证的内部系统与管理后台、依赖 JS 动态渲染的 SPA、含登录态业务数据的页面。工作方式为"用户先在浏览器中人工登录并打开目标页面，技能复用该浏览器已认证的会话完成抓取"。当用户要求"抓取需要登录的页面""复刻这个后台页面""克隆当前打开的页面""1:1 还原这个网页""提取页面 HTML/CSS""生成高保真原型""把线上页面转成本地副本"时使用本技能。
agent_created: true
---

# Page Clone

接管用户已经登录、已经打开的浏览器页面，把渲染后的真实 DOM 与 CSS 抽出来，变成能本地打开的静态 HTML 副本。

## 何时使用

**优先场景 —— 命令行抓不到的页面：**

- 目标页面需要账号密码、SSO 单点登录、验证码或多因子认证，curl / requests / wget 拿到的只是登录页或 401
- 目标页面是内部系统、管理后台、运维控制台，只能在内网或特定账号下访问
- 目标内容由 JS 动态渲染（前端框架、SPA、虚拟滚动），原始 HTML 里没有数据
- 页面数据随登录身份变化——同一 URL，不同账号看到的内容不同
- 需要连同登录后的真实数据一起留档、离线查看、做成原型

**其他适用：**复刻公开页面、做竞品页面的精确实现、把线上页面转成本地原型或归档件。

**不适用：**批量爬站；代替用户完成登录（账号、密码、验证码一律由用户自己操作）；抓取尚未打开的页面。

## 为什么命令行方式不行

本技能不是"更强的爬虫"，而是换了一条通路：

| | curl / requests / 普通爬虫 | 本技能 |
|---|---|---|
| 登录态 | 无 Cookie，撞登录页 | 复用用户已认证的浏览器会话 |
| 渲染 | 只拿到 HTML 骨架 | 拿到 JS 渲染完成后的真实 DOM |
| 可见性 | 权限不足时看到空白 | 与用户肉眼所见完全一致 |
| 交互门槛 | 无法处理验证码、SSO、MFA | 用户在浏览器里人工完成 |

实现上通过 `--browserUrl` 附着（attach）到**已在运行的浏览器实例**，不新开实例、不新起 profile，因此用户已经登录好的会话和已渲染的页面原样保留。

## 前置条件

| # | 条件 | 说明 |
|---|------|------|
| 1 | 目标页面已由用户**人工登录并打开** | 本技能不代替用户登录，也不接收任何账号密码 |
| 2 | 浏览器以远程调试端口启动 | 默认 9222 |
| 3 | `chrome-devtools-mcp` 可用 | `npm install chrome-devtools-mcp` |

### 启动带调试端口的浏览器

Chrome / Edge：

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-clone-profile"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-clone-profile"
```

> **Chrome 136 起**，出于 Cookie 安全考虑，`--remote-debugging-port` 在默认用户目录上会被**静默忽略**，必须配 `--user-data-dir` 指向独立目录。排查连不上 9222 时先看这一条。
>
> 独立 profile 恰好契合本技能用法：**登录一次、长期复用**。会话保存在该 profile 中，之后每次用同一个 `--user-data-dir` 启动浏览器即是登录态，无需重复登录。

第 2 项未满足时脚本报 `Connection refused`。其他排查见 [references/troubleshooting.md](references/troubleshooting.md)。

## 执行流程

流程中有一个人工卡点：**第 0 步必须由用户完成**。

### 第 0 步（人工）：登录并打开目标页面

1. 用上面的命令启动浏览器
2. 在这个浏览器里完成登录（账号密码、SSO、验证码、扫码都由用户自己操作）
3. 导航到目标页面，等内容**完全加载**：骨架屏消失、表格数据渲染完毕、懒加载内容已展开

未完成这一步就执行第 2 步，抓到的是登录页或空骨架——这是本技能最常见的失败原因。

### 第 1 步：列出候选页面

```bash
node scripts/list-pages.js --port 9222
```

也可写成 `node scripts/clone.js list`。

输出形如：

```
ID  | Title                     | URL
----+--------------------------+--------------------------------
8   | 模块详情                   | https://124.70.184.162/projects/module
```

若用户未指明具体页面，把这份清单回给用户确认目标，而不是直接猜测。

### 第 2 步：执行克隆

```bash
# 按页面 ID（推荐，精确）
node scripts/clone.js --pageId 8 --output ./my-clone

# 按 URL 关键词
node scripts/clone.js --url "example.com" --output ./example-clone

# HTML + CSS 分离
node scripts/clone.js --pageId 8 --format separate --output ./my-clone
```

省略 `--pageId` 和 `--url` 时，脚本选取第一个非空白页。

### 第 3 步：验证产出

克隆完成后**必须**检查，不要直接交付：

1. 读 `metadata.json`，确认 `url` 与 `title` 是目标页面，`sizes.css` 不为 0
2. 打开生成的 HTML，核对内容——**重点确认抓到的是登录后的页面，而不是登录页**
3. 若 `sizes.css` 明显偏小，说明存在跨域样式表未取到 —— 见下方「已知限制」
4. 输出目录以原网页的 `name` 属性命名，若不满意可改名，但不要随意改动目录结构

## 输出结构

`--format single`（默认）：

```
output/
├── pagename.html          # 独立 HTML，CSS 内联在 <style> 中，明明要和原网页的name属性保持一致
├── screenshot.png      # 页面截图
└── metadata.json       # url / title / clonedAt / format / sizes
```

`--format separate`：

```
output/
├── index.html          # HTML，引用 styles.css
├── styles.css          # 提取出的全部 CSS
├── screenshot.png
└── metadata.json
```

## 参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `--pageId` | number | 浏览器标签页 ID | 第一个非空白页 |
| `--url` | string | URL 关键词（子串匹配） | - |
| `--output` | string | 输出目录 | `./page-clone-output` |
| `--format` | string | `single` / `separate` | `single` |
| `--port` | number | 浏览器调试端口 | `9222` |

## 程序化调用

```javascript
const { clonePage, listPages } = require('./scripts/clone.js');

const pages = await listPages({ port: 9222 });
const result = await clonePage({
  pageId: pages[0].id,
  output: './my-clone',
  format: 'single'
});
// result: { outputDir, files[], metadata }
```

完整 API 与类型定义见 [references/api.md](references/api.md)。

## MCP 服务器模式

```bash
node scripts/mcp-server.js
```

暴露 `list_pages`、`clone_page`、`clone_by_url` 三个工具。配置示例见 [references/mcp-config.md](references/mcp-config.md)。

## 已知限制

- **只产出静态快照**：不包含交互状态，动态内容需在页面完全加载后再克隆
- **产物可能含敏感数据**：克隆的是登录后的真实业务数据（用户名、订单、内部指标等）。产物目录按敏感文件对待，不要提交到公开仓库
- **登录态不会被写入产物**：Cookie、token、Session 不在 HTML 中，克隆页离线打开时不会自动处于登录态
- **跨域样式表取不到**：跨源 CSS 的 `cssRules` 受同源策略限制，无法读取，输出中会留 `/* External: ... */` 注释占位。内部系统多为同源，通常不受影响；确有跨源时联网打开或手动补全 `styles.css`
- **图片不内联**：`<img>` 仍指向原图地址，离线打开时图片缺失
- **会话过期需重新登录**：调试浏览器里的会话失效后，页面会跳回登录页，需用户重新登录再克隆

## 资源

| 路径 | 内容 |
|------|------|
| `scripts/clone.js` | 克隆主程序，同时导出 `clonePage` / `listPages` |
| `scripts/list-pages.js` | 列出标签页 |
| `scripts/mcp-server.js` | MCP 服务器封装 |
| `references/api.md` | 程序化 API、MCP 工具 schema、错误处理 |
| `references/mcp-config.md` | MCP 客户端接入配置 |
| `references/troubleshooting.md` | 故障排查：端口、登录态、页面匹配、CSS 缺失 |
| `examples/basic-usage.js` | 程序化调用示例 |
