#!/usr/bin/env node
/**
 * List Pages Script
 * 列出浏览器中所有打开的标签页
 */

const { MCPClient } = require('./clone.js');

async function main() {
  const port = process.argv.find((_, i) => process.argv[i-1] === '--port') || 9222;
  
  console.log('🔍 Listing browser pages...\n');
  
  const client = new MCPClient(parseInt(port));
  await client.connect();
  
  try {
    await client.initialize();
    const pages = await client.listPages();
    
    console.log(`Found ${pages.length} pages:\n`);
    console.log('ID  | Title                                      | URL');
    console.log('----+--------------------------------------------+--------------------------------');
    
    for (const page of pages) {
      const title = page.title.slice(0, 40).padEnd(40);
      const url = page.url.slice(0, 50);
      console.log(`${String(page.id).padEnd(3)} | ${title} | ${url}`);
    }
    
  } finally {
    client.disconnect();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
