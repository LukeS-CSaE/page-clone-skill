# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [未发布]

## [0.1.0] - 2026-11-10

### ✨ 新增

- SKILL.md 重构为标准 Skill 格式：补充 YAML frontmatter（name / description / agent_created），正文改为面向执行的工作流说明
- 新增 `references/` 目录承载详细文档，实现渐进式披露
  - `references/api.md` — 程序化 API、MCP 工具 schema、错误处理
  - `references/mcp-config.md` — MCP 客户端接入配置
  - `references/troubleshooting.md` — 故障排查手册
- 支持 `page-clone list` / `page-clone clone` 子命令写法
- 导出 `clonePage` / `listPages` 程序化 API（此前文档承诺但未实现）

### 📝 定位调整

明确本技能的核心场景为**抓取命令行无法黑箱获取的登录态页面**（需账号密码 / SSO / 验证码 / MFA 的内部系统与后台、JS 动态渲染的 SPA、随登录身份变化的数据）：

- SKILL.md description 改为以登录态页面为主场景，补齐「抓取需要登录的页面」「复刻后台页面」等触发词
- SKILL.md 正文新增「为什么命令行方式不行」对比表，说明本技能通过 `--browserUrl` 附着既有浏览器而非另起实例
- 执行流程前置「第 0 步（人工）：登录并打开目标页面」，明确人工卡点
- 移除原先「不要用于抓取需要登录的页面」的错误限制
- 补充 Chrome 136+ 必须指定 `--user-data-dir` 的约束，并说明独立 profile 可复用登录态
- 明确产物含登录后业务数据（敏感文件对待）、登录态不写入产物等边界
- 明确 `--url` 为已打开标签页的子串匹配，不承担导航职责
- troubleshooting 新增「抓到登录页」「会话过期」「Chrome 136+ 端口被忽略」等条目

### 🐛 修复

- 移除 `chrome-devtools-mcp` 的硬编码个人路径，改为按「本地 → 全局 → 环境变量」顺序自动定位
- 修复截图从未落盘：MCP 返回的 `content[0]` 是文本块，图片位于 `type === 'image'` 的块中
- 修复参数解析错位：原 `i += 2` 步进在参数含 `--key=value` 形式时会误消费下一个参数
- 修复页面列表解析：URL 含括号时旧正则截断；非 http(s) 页面现被正确过滤
- 修复 `evaluate_script` 返回值还原：改为解析 ```json 代码块后 `JSON.parse`，避免反斜杠误伤
- 目标页面未匹配时抛出明确错误并列出可用页面，而非静默回退到首个页面
- `metadata.json` 增加 `format` 字段

### 📚 文档

- `docs/API.md` 迁移至 `references/api.md`
- README 补充已知限制（跨域 CSS、静态快照、图片不内联、敏感数据、登录态不落盘）
- Node.js 版本要求提升至 ≥ 20.19.0（`chrome-devtools-mcp` 硬性要求）

### 🚧 计划中

- [ ] 组件级提取（按 CSS 选择器提取特定组件）
- [ ] 批量克隆功能
- [ ] 图片资源下载
- [ ] React/Vue 组件生成
- [ ] 热重载支持
- [ ] TypeScript 类型定义优化

---

[0.1.0]: https://gitee.com/moresecleft/page-clone-skill/releases/v0.1.0
[0.0.1]: https://gitee.com/moresecleft/page-clone-skill/releases/v0.0.1
