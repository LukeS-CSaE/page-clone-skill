# 故障排查

## 调试端口未开启

**症状**：`Error: spawn ... ENOENT` 或 MCP 连接超时，`Found 0 pages`

**原因**：浏览器未以 `--remote-debugging-port` 启动，或端口与 `--port` 不一致。

**解决**：

Chrome / Edge：

```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\chrome-clone-profile"

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/chrome-clone-profile"
```

必须**完全退出**浏览器进程再重启 —— 已运行的实例不会接受新参数。

Tabbit 默认自动开启调试端口；若未开启，重启时加上同一参数。

验证端口：

```bash
curl http://127.0.0.1:9222/json/version
```

## Chrome 136+ 端口参数被忽略（连不上 9222）

**症状**：浏览器确实带着 `--remote-debugging-port=9222` 启动，但 `curl http://127.0.0.1:9222/json/version` 连接失败，或 `Found 0 pages`

**原因**：自 Chrome 136 起，出于 Cookie 加密安全考虑，`--remote-debugging-port` 和 `--remote-debugging-pipe` 在**默认 Chrome 数据目录**上不再生效，必须搭配 `--user-data-dir` 指向非标准目录。

**解决**：加一个独立 profile 目录：

```bash
chrome --remote-debugging-port=9222 --user-data-dir="C:\chrome-clone-profile"
```

**这个限制反而利好本技能**：独立 profile 的会话独立保存，登录一次之后每次用同一个 `--user-data-dir` 启动都保持登录态，无需反复登录。

若想复用日常浏览器的登录态，不要直接改默认目录，而是把常用 profile 复制到独立目录后启动 —— 但 Chrome 136 的应用绑定加密会阻止直接复制 Cookie，需要额外处理，且存在安全风险，不推荐。

## 抓到的是登录页而不是目标页面

**症状**：克隆出的 HTML 是登录框、跳转提示或空白骨架

**原因**（按概率排序）：

1. 用户还没完成登录，或登录后没有导航到目标页面 —— 目标页根本没在浏览器里打开
2. 页面还在加载中，JS 尚未渲染完
3. 会话已过期，页面被服务端重定向回登录页
4. 选错了标签页（`list_pages` 返回多个页面时按 ID 选错）

**解决**：让用户确认目标页已打开且内容完整，再用 `node scripts/list-pages.js` 复核 ID。SPA 页面可先手动滚动到底部触发懒加载，再执行克隆。

## 会话过期

**症状**：昨天能抓的页面，今天抓到登录页

**原因**：调试浏览器的会话过期，或服务端刷新了 token

**解决**：在调试浏览器里重新登录，再次执行克隆。使用独立 `--user-data-dir` 时登录态可长期保留，过期通常来自服务端的会话时长限制。

## 找不到目标页面

**症状**：`未找到 ID 为 N 的页面` 或 `未找到 URL 包含 "x" 的页面`

**原因**：pageId 已失效（刷新/关闭标签页后 ID 会变），或 URL 关键词不匹配。

**解决**：

```bash
node scripts/list-pages.js --port 9222
```

重新获取 ID。URL 关键词为子串匹配，用域名片段即可（如 `example.com`）。

## chrome-devtools-mcp 未安装

**症状**：`未找到 chrome-devtools-mcp`

**解决**：

```bash
npm install chrome-devtools-mcp
```

装在全局时脚本会自动通过 `npm root -g` 定位。若使用了自定义路径：

```bash
export CHROME_DEVTOOLS_MCP_PATH=/path/to/chrome-devtools-mcp-main.js
```

## CSS 缺失

**症状**：`metadata.json` 中 `sizes.css` 明显偏小，或生成的 HTML 样式错乱

**原因**：跨源样式表的 `cssRules` 受同源策略保护，浏览器不允许读取。

**识别**：生成的 CSS 中会出现占位注释：

```css
/* External: https://cdn.example.com/main.css */
```

**解决**：

1. 联网打开克隆页 —— 样式会由原 CDN 补齐（推荐）
2. 手动下载该 CSS，追加进 `styles.css`
3. 若样式来自内联 `<style>` 标签，会正常提取，不受此限制

## 截图未生成

**症状**：输出目录缺少 `screenshot.png`，日志出现 `⚠️ Screenshot skipped`

**原因**：MCP 返回内容中无图片块，通常是页面过大（超过 2MB 时 MCP 改为存临时文件而不内联）。

**解决**：不影响 HTML 克隆结果，可忽略；需要截图时改用浏览器自带截图功能。

## 克隆内容不完整

**症状**：生成的 HTML 缺少动态渲染的部分

**原因**：克隆发生在页面数据加载完成之前。

**解决**：等待页面完全渲染（骨架屏消失）再执行克隆。SPA 可先手动滚动到底部触发懒加载。

## Node 版本过低

**症状**：MCP 服务器启动即退出，无输出

**原因**：`chrome-devtools-mcp` 要求 Node.js ≥ 20.19.0

**解决**：升级 Node.js 后重试。

## 参数相关

| 症状 | 原因 |
|------|------|
| `参数 --xxx 缺少值` | 命令行中该参数后没有跟值 |
| `--format 只能是 single 或 separate` | 格式值拼写错误 |
| `忽略未知参数: --xxx` | 参数名拼写错误，可忽略 |
