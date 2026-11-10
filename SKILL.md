# Page Clone Skill

> 从浏览器标签页提取完整 HTML + CSS，生成 1:1 高保真静态页面克隆

## 触发条件

当用户提出以下需求时自动触发：
- "复刻这个网页" / "克隆页面" / "1:1 还原网页"
- "提取页面 HTML/CSS" / "抓取网页样式"
- "生成高保真原型" / "制作静态页面副本"

## 前置要求

1. **浏览器已开启远程调试端口**（默认 9222）
2. **目标页面已在浏览器中打开**
3. **已安装 chrome-devtools-mcp**：`npm install -g chrome-devtools-mcp`

## 核心功能

### 1. 列出浏览器页面

```bash
node scripts/list-pages.js --port 9222
```

**输出：**
```
ID  | Title    | URL
----+----------+--------------------------------
8   | 模块详情  | https://124.70.184.162/projects/module
```

### 2. 克隆页面

```bash
# 按页面 ID
node scripts/clone.js --pageId 8 --output ./my-clone

# 按 URL 关键词
node scripts/clone.js --url "example.com" --output ./example-clone

# HTML + CSS 分离
node scripts/clone.js --pageId 8 --format separate
```

### 3. MCP 服务器模式

```bash
node scripts/mcp-server.js
```

**DSH 配置：**
```yaml
- id: mcp-page-clone
  name: "@deepseek-ai/dsh-mcp-client"
  config:
    serverName: page-clone
    transport: stdio
    command: node
    args:
      - "C:\\path\\to\\page-clone-skill\\scripts\\mcp-server.js"
```

## 参数说明

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `--pageId` | number | 浏览器标签页 ID | 第一个非空页面 |
| `--url` | string | URL 关键词匹配 | - |
| `--output` | string | 输出目录 | `./page-clone-output` |
| `--format` | string | `single`/`separate` | `single` |
| `--port` | number | 调试端口 | `9222` |

## 输出格式

### single（默认）
```
output/
├── clone.html          # 独立 HTML（CSS 内联）
├── screenshot.png
└── metadata.json
```

### separate
```
output/
├── index.html
├── styles.css
├── screenshot.png
└── metadata.json
```

## 使用示例

### 示例 1：克隆当前页面

```bash
# 1. 确保浏览器已开启调试端口
# 2. 执行克隆
node scripts/clone.js --output ./sca-clone

# 3. 查看结果
open ./sca-clone/clone.html
```

### 示例 2：通过 URL 克隆

```bash
node scripts/clone.js \
  --url "124.70.184.162" \
  --output ./module-clone \
  --format separate
```

### 示例 3：在代码中使用

```javascript
const { clonePage, listPages } = require('./scripts/clone.js');

// 列出页面
const pages = await listPages({ port: 9222 });

// 克隆
const result = await clonePage({
  pageId: 8,
  output: './my-clone'
});
```

## 故障排除

### 端口未开启

**Chrome:**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Tabbit:** 自动开启或重启时添加参数

### 页面未找到

```bash
# 列出所有页面
node scripts/list-pages.js
```

## 技术原理

```
Browser (port 9222)
    ↓
chrome-devtools-mcp (stdio)
    ↓
clone.js / mcp-server.js
    ↓
HTML + CSS → clone.html
```

1. 通过 `--browserUrl` 连接浏览器
2. 使用 `evaluate_script` 提取 `outerHTML`
3. 使用 `evaluate_script` 提取所有 `document.styleSheets`
4. 合并生成独立 HTML 文件

## 依赖

- Node.js >= 16
- chrome-devtools-mcp >= 1.12.0

## 版本历史

- **v1.0.0** (2026-01-10) - 初始版本，支持基础克隆和 MCP 服务器

## 许可证

MIT License
