#!/usr/bin/env node
/**
 * List Pages Script
 * 列出浏览器中所有打开的标签页
 */

const { listPages } = require('./clone.js');

async function main() {
  const argv = process.argv.slice(2);
  const portIndex = argv.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(argv[portIndex + 1], 10) : 9222;

  console.log('🔍 Listing browser pages...\n');

  const pages = await listPages({ port });

  console.log(`Found ${pages.length} pages:\n`);
  console.log('ID  | Title                                      | URL');
  console.log('----+--------------------------------------------+--------------------------------');

  for (const page of pages) {
    const title = page.title.slice(0, 40).padEnd(40);
    const url = page.url.slice(0, 50);
    console.log(`${String(page.id).padEnd(3)} | ${title} | ${url}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
