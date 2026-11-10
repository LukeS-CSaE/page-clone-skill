# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-01-10

### ✨ 新增

- 初始版本发布
- 支持从浏览器标签页克隆完整 HTML + CSS
- 支持多种输出格式（single/separate）
- 支持 URL 匹配和页面 ID 定位
- 提供 CLI 工具（clone.js, list-pages.js）
- 提供 MCP 服务器（mcp-server.js）
- 完整的文档和示例

### 🔧 技术特性

- 基于 chrome-devtools-mcp 实现浏览器自动化
- 支持 Chrome、Edge、Tabbit 等 Chromium 浏览器
- 自动清理 MCP 返回的 JSON 包装
- 生成独立的 HTML 文件（CSS 内联）
- 支持跨域样式表提取

### 📚 文档

- README.md - 项目介绍和快速开始
- SKILL.md - Skill 定义和使用说明
- docs/API.md - 详细的 API 文档
- examples/basic-usage.js - 基础使用示例

## [未发布]

### 🚧 计划中

- [ ] 组件级提取（按 CSS 选择器提取特定组件）
- [ ] 批量克隆功能
- [ ] 图片资源下载
- [ ] React/Vue 组件生成
- [ ] 热重载支持
- [ ] TypeScript 类型定义优化

---

[1.0.0]: https://gitee.com/moresecleft/page-clone-skill/releases/v1.0.0
