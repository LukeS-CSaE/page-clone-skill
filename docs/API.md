# API Documentation

## Core Functions

### `clonePage(options)`

克隆浏览器页面。

#### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `options.pageId` | `number` | Browser tab ID | - |
| `options.url` | `string` | URL keyword to match | - |
| `options.output` | `string` | Output directory | `./page-clone-output` |
| `options.format` | `string` | Output format (`single`/`separate`) | `single` |
| `options.port` | `number` | Debug port | `9222` |

#### Returns

`Promise<CloneResult>`

```typescript
interface CloneResult {
  outputDir: string;
  files: string[];
  metadata: {
    url: string;
    title: string;
    clonedAt: string;
    sizes: {
      html: number;
      css: number;
    };
  };
}
```

#### Example

```javascript
const { clonePage } = require('@moresec/page-clone-skill');

const result = await clonePage({
  pageId: 8,
  output: './my-clone',
  format: 'single'
});

console.log(`Cloned to: ${result.outputDir}`);
console.log(`Files: ${result.files.join(', ')}`);
```

---

### `listPages(options)`

列出浏览器中所有打开的页面。

#### Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `options.port` | `number` | Debug port | `9222` |

#### Returns

`Promise<PageInfo[]>`

```typescript
interface PageInfo {
  id: number;
  title: string;
  url: string;
}
```

#### Example

```javascript
const { listPages } = require('@moresec/page-clone-skill');

const pages = await listPages({ port: 9222 });

pages.forEach(page => {
  console.log(`[${page.id}] ${page.title} - ${page.url}`);
});
```

---

## MCP Server

### Starting the Server

```bash
node scripts/mcp-server.js
```

### Available Tools

#### `list_pages`

List all open browser tabs.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "port": {
      "type": "number",
      "description": "Browser debug port",
      "default": 9222
    }
  }
}
```

**Example Response:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "ID  | Title    | URL\n----+----------+-------------------------------\n1   | Example  | https://example.com\n..."
    }
  ]
}
```

---

#### `clone_page`

Clone a specific page.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "pageId": {
      "type": "number",
      "description": "Browser tab ID"
    },
    "url": {
      "type": "string",
      "description": "URL keyword to match"
    },
    "output": {
      "type": "string",
      "description": "Output directory",
      "default": "./page-clone-output"
    },
    "format": {
      "type": "string",
      "enum": ["single", "separate"],
      "default": "single"
    },
    "port": {
      "type": "number",
      "default": 9222
    }
  }
}
```

---

#### `clone_by_url`

Clone a page by URL keyword (convenience method).

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "URL keyword"
    },
    "output": {
      "type": "string",
      "default": "./page-clone-output"
    },
    "port": {
      "type": "number",
      "default": 9222
    }
  },
  "required": ["url"]
}
```

---

## Error Handling

### Common Errors

#### `Connection refused`

**Cause:** Browser debug port not open.

**Solution:**

```bash
# Chrome
chrome.exe --remote-debugging-port=9222

# Tabbit
# Restart with --remote-debugging-port=9222
```

---

#### `Target page not found`

**Cause:** Page ID or URL doesn't match any open tab.

**Solution:**

```bash
# List all pages to find correct ID
node scripts/list-pages.js
```

---

#### `Script failed with code 1`

**Cause:** Clone script execution failed.

**Solution:**

1. Check browser console for errors
2. Verify page is fully loaded
3. Try with `--format separate`

---

## Advanced Usage

### Batch Cloning

```javascript
const { clonePage } = require('@moresec/page-clone-skill');

const urls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3'
];

for (const url of urls) {
  try {
    console.log(`Cloning ${url}...`);
    await clonePage({
      url,
      output: `./clones/${new URL(url).pathname.split('/').pop()}`
    });
    console.log(`✅ ${url} cloned successfully`);
  } catch (error) {
    console.error(`❌ Failed to clone ${url}:`, error.message);
  }
}
```

---

### Custom Post-Processing

```javascript
const { clonePage } = require('@moresec/page-clone-skill');
const fs = require('fs');

const result = await clonePage({
  pageId: 8,
  output: './raw-clone'
});

// Read the cloned HTML
const html = fs.readFileSync(`${result.outputDir}/clone.html`, 'utf8');

// Apply custom transformations
const modified = html
  .replace(/old-domain\.com/g, 'new-domain.com')
  .replace(/#ff0000/g, '#00ff00');

// Save modified version
fs.writeFileSync(`${result.outputDir}/clone-modified.html`, modified);
```

---

## TypeScript Support

TypeScript definitions are included.

```typescript
import { clonePage, listPages, PageInfo, CloneResult } from '@moresec/page-clone-skill';

const pages: PageInfo[] = await listPages({ port: 9222 });
const result: CloneResult = await clonePage({ pageId: 8 });
```
