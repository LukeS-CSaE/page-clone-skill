/**
 * 基础使用示例
 * 演示如何使用 page-clone-skill 克隆网页
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

    // 步骤 2: 选择要克隆的页面
    const targetPage = pages.find(p => !p.url.includes('about:blank')) || pages[0];
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

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure browser is running with --remote-debugging-port=9222');
    console.log('2. Check if the page is loaded in the browser');
    console.log('3. Verify chrome-devtools-mcp is installed: npm install -g chrome-devtools-mcp');
  }
}

main();
