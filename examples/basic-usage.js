/**
 * 基础使用示例
 * 演示如何使用 page-clone-skill 克隆网页
 *
 * 运行：node examples/basic-usage.js
 */

const { clonePage, listPages } = require('../scripts/clone.js');

async function main() {
  console.log('🔍 Page Clone Skill - Basic Usage Example\n');

  try {
    // 步骤 1: 列出浏览器页面
    console.log('Step 1: Listing browser pages...');
    const pages = await listPages({ port: 9222 });
    console.log(`Found ${pages.length} pages:`);
    pages.slice(0, 5).forEach(p => {
      console.log(`  [${p.id}] ${p.title.slice(0, 40)} - ${p.url.slice(0, 50)}`);
    });
    console.log('');

    if (pages.length === 0) {
      console.log('没有可克隆的页面，请先在浏览器中登录并打开目标页面。');
      return;
    }

    // 步骤 2: 选择要克隆的页面
    const targetPage = pages[0];
    console.log(`Step 2: Selected page "${targetPage.title}" (ID: ${targetPage.id})\n`);

    // 步骤 3: 克隆页面
    console.log('Step 3: Cloning page...');
    const result = await clonePage({
      pageId: targetPage.id,
      output: './example-output',
      format: 'single'
    });

    console.log('\n✅ Clone successful!');
    console.log(`Output directory: ${result.outputDir}`);
    console.log(`Files: ${result.files.join(', ')}`);
    console.log('\n提示：产物包含登录后的真实业务数据，请按敏感文件对待。');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure browser is running with --remote-debugging-port=9222');
    console.log('   (Chrome 136+ 还需要 --user-data-dir="<独立目录>"，否则该参数会被忽略)');
    console.log('2. 在浏览器中人工登录，并确认目标页面已打开、内容已加载完');
    console.log('3. Verify chrome-devtools-mcp is installed: npm install chrome-devtools-mcp');
  }
}

main();
