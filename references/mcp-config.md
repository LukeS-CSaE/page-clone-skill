# MCP 接入配置

## 本地直接启动

```bash
node scripts/mcp-server.js
```

服务器通过 stdio 通信，标准输入输出即为 MCP 协议消息。

## WorkBuddy 配置

写入 `~/.workbuddy/mcp.json`（用户级），或项目内 `.workbuddy/mcp.json`（项目级）：

```json
{
  "mcpServers": {
    "page-clone": {
      "command": "node",
      "args": [
        "C:\\path\\to\\page-clone-skill\\scripts\\mcp-server.js"
      ]
    }
  }
}
```

保存后需在连接器管理页面右上角的自定义连接器入口点击「信任」，该 MCP 才会启用。

## 其他 MCP 客户端

任何支持 stdio 传输的客户端都可用同样配置：

| 客户端 | 配置位置 |
|--------|----------|
| Claude Code | `.mcp.json`（项目级）或 `~/.claude.json` |
| Claude Desktop | 设置 → 开发者 → MCP 服务器 |
| Cursor | `.cursor/mcp.json` |
| VS Code | `.vscode/mcp.json` |

通用格式：

```json
{
  "mcpServers": {
    "page-clone": {
      "command": "node",
      "args": ["/absolute/path/to/page-clone-skill/scripts/mcp-server.js"],
      "env": {}
    }
  }
}
```

## 路径注意事项

- `args` 必须是**绝对路径**，相对路径在不同工作目录下解析结果不同
- Windows 路径中的反斜杠需在 JSON 中转义（`C:\\path\\to\\...`），或改用正斜杠（`C:/path/to/...`）
- Node.js 版本需 ≥ 20.19.0 —— `chrome-devtools-mcp` 会检查并在低版本时直接退出

## 验证配置

先确认脚本本身能跑通，再接入 MCP 客户端：

```bash
# 1. 依赖就绪
npm install chrome-devtools-mcp

# 2. 浏览器调试端口已开，目标页已人工登录并打开
node scripts/list-pages.js --port 9222

# 3. 克隆可用
node scripts/clone.js --url "example.com" --output ./mcp-check
```

三步都通过后，MCP 客户端调用失败通常源于 `args` 路径或 Node 版本。

> 注意：MCP 客户端与 CLI 走的是同一条通路 —— 附着到同一个已在运行的浏览器、复用同一份登录态。MCP 服务本身不会另起浏览器，也不代替用户登录。
