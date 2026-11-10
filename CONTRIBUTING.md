# 贡献指南

感谢你对 Page Clone Skill 的贡献！

## 开发流程

### 1. Fork 和克隆

```bash
# Fork 项目到你的账号
# 然后克隆
git clone https://gitee.com/YOUR_USERNAME/page-clone-skill.git
cd page-clone-skill
```

### 2. 安装依赖

```bash
npm install
```

### 3. 创建分支

```bash
git checkout -b feature/your-feature-name
```

### 4. 开发和测试

```bash
# 运行测试
npm test

# 运行示例
npm run example

# 启动 MCP 服务器测试
npm run mcp
```

### 5. 提交代码

```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### 6. 创建 Pull Request

## 代码规范

### JavaScript 风格

- 使用 ES6+ 语法
- 使用 `const` 和 `let`，避免 `var`
- 使用箭头函数
- 使用模板字符串
- 添加 JSDoc 注释

### 示例

```javascript
/**
 * 克隆页面
 * @param {Object} options - 配置选项
 * @param {number} options.pageId - 页面 ID
 * @param {string} options.output - 输出目录
 * @returns {Promise<CloneResult>} 克隆结果
 */
async function clonePage(options) {
  // 实现代码
}
```

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具链

## 测试

### 运行测试

```bash
npm test
```

### 添加测试

在 `tests/` 目录下创建测试文件：

```javascript
// tests/clone.test.js
const { clonePage } = require('../scripts/clone.js');

describe('clonePage', () => {
  it('should clone page successfully', async () => {
    const result = await clonePage({ pageId: 1 });
    expect(result).toHaveProperty('outputDir');
  });
});
```

## 文档

- 更新 `README.md` 中的使用说明
- 更新 `references/api.md` 中的 API 文档
- 更新 `SKILL.md` 中的执行流程（保持 YAML frontmatter 合法）
- 添加 JSDoc 注释
- 更新 `CHANGELOG.md`

## 问题反馈

如果你发现了 bug 或有功能建议，请 [创建 Issue](https://gitee.com/moresecleft/page-clone-skill/issues)。

## 许可证

贡献的代码将采用 [MIT 许可证](LICENSE)。
