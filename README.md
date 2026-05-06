# sbox-mcp-documentation

[![npm version](https://img.shields.io/npm/v/sbox-mcp-documentation.svg)](https://www.npmjs.com/package/sbox-mcp-documentation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that provides AI assistants with searchable access to the full **s&box** game engine documentation — 180+ pages of guides, tutorials, and concepts — plus the complete **API reference** with 1,800+ types and 15,000+ members.

## Quick Start

No installation required — use `npx` directly in your MCP config:

```json
{
    "servers": {
        "sbox-docs": {
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "sbox-mcp-documentation"]
        }
    }
}
```

Or install globally:

```bash
npm install -g sbox-mcp-documentation
```

## Features

### Documentation
- **Full-text search** across all s&box documentation with fuzzy matching and relevance ranking
- **Direct page retrieval** with chunked reading for large pages
- **Category browsing** to discover available documentation topics

### API Reference
- **API type search** across 1,800+ public types (classes, structs, enums, interfaces) with member-aware ranking
- **Detailed type lookup** — methods, properties, fields, events, XML doc comments, and inheritance info
- **Chunked output** for large types so no detail is truncated

### General
- **Automatic caching** — docs cached for 4 hours, API schema cached for 24 hours
- **Background indexing** on startup — both subsystems ready within seconds
- **Built-in self-tests** to verify the server is working correctly

## Data Sources

### Documentation
Documentation is fetched from the official [s&box wiki](https://sbox.game/dev/doc) via the LLM-optimized index at [sbox.game/llms.txt](https://sbox.game/llms.txt). This file lists all available documentation pages, and each page is fetched as raw Markdown from `sbox.game/dev/doc/{page}.md`. The server crawls all listed pages and builds a local search index using [MiniSearch](https://lucaong.github.io/minisearch/).

### API Reference
The API schema is downloaded from the Facepunch CDN as a JSON file (the same data powering [sbox.game/api](https://sbox.game/api)). It contains all public types from the s&box assembly — 1,800+ types with full member signatures, XML doc comments, and inheritance info. The server strips internal/compiler-generated types and indexes everything with MiniSearch for fast fuzzy lookup.

## Installation

### Option 1: npx (recommended)

No install needed. Just reference `npx sbox-mcp-documentation` in your MCP configuration (see below).

### Option 2: Global install

```bash
npm install -g sbox-mcp-documentation
```

### Option 3: From source

```bash
git clone https://github.com/fiedlermarius/sbox-mcp-documentation.git
cd sbox-mcp-documentation
npm install
npm run build
```

## Configuration

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
    "servers": {
        "sbox-docs": {
            "type": "stdio",
            "command": "npx",
            "args": ["-y", "sbox-mcp-documentation"]
        }
    }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
    "mcpServers": {
        "sbox-docs": {
            "command": "npx",
            "args": ["-y", "sbox-mcp-documentation"]
        }
    }
}
```

### Claude Desktop

Add to your Claude Desktop config (`%APPDATA%/Claude/claude_desktop_config.json` on Windows):

```json
{
    "mcpServers": {
        "sbox-docs": {
            "command": "npx",
            "args": ["-y", "sbox-mcp-documentation"]
        }
    }
}
```

#### Local Checkout Example

If you want to use a local checkout instead of `npx`, update your configuration as follows:

```json
{
    "servers": {
        "sbox-docs": {
            "type": "stdio",
            "command": "node",
            "args": ["<path-to-repo>/dist/index.js"]
        }
    }
}
```

As shown above, you need to replace `"command": "npx"` and `"args"` with `"command": "node"` and `"args": ["<path-to-repo>/dist/index.js"]`.

## Tools

| Tool | Description |
|------|-------------|
| `sbox_search_docs` | Search documentation with fuzzy matching. Returns titles, URLs, categories, and relevant snippets. Supports category filtering and result limits. |
| `sbox_get_doc_page` | Fetch a specific documentation page as Markdown. Supports chunked reading via `start_index` and `max_length` for large pages. |
| `sbox_list_doc_categories` | List all documentation categories with page counts. Useful for discovering what topics are available. |
| `sbox_search_api` | Search the s&box API reference by type name, namespace, or keyword. Returns matching types with namespace, description, and top member names. |
| `sbox_get_api_type` | Get full details for a specific API type — all methods, properties, fields, events, XML doc comments, and inheritance. Supports chunked output for large types. |
| `sbox_cache_status` | Show cache and index health — page counts, freshness, and whether both docs and API indexing are complete. |
| `sbox_run_tests` | Run built-in self-tests for all six modules (cache, search, crawler — docs and API). Returns pass/fail results per test case. |

## Architecture

```
sbox.game/llms.txt (doc index)            cdn.sbox.game (AssemblySchema JSON)
        │                                           │
        ▼                                           ▼
   DocCrawler ──► GET /llms.txt             ApiCrawler ──► resolves schema URL
        │         GET /dev/doc/*.md               │         downloads + filters types
        │                                           │
        ▼                                           ▼
     DocCache ──► ~/.sbox-docs-mcp/cache/       ApiCache ──► ~/.sbox-docs-mcp/cache/
        │        manifest.json (TTL 4h)              │        api-types.json (TTL 24h)
        │                                           │
        ▼                                           ▼
   DocSearch ──► MiniSearch index            ApiSearch ──► MiniSearch index
                 title (3x), category (2x),              name (4x), fullName (3x),
                 content (1x)                            members (2x), namespace (1.5x)
```

### Cache Behavior

- **Location:** `~/.sbox-docs-mcp/cache/`
- **Docs TTL:** 4 hours (configurable via `SBOX_DOCS_CACHE_TTL` env var, in seconds)
- **API TTL:** 24 hours — the schema is large (~9 MB) and changes infrequently
- **Custom directory:** Set `SBOX_DOCS_CACHE_DIR` env var
- Both caches are populated on server startup in the background
- Set `SBOX_API_SCHEMA_URL` to pin a specific schema version

## Related Projects

- [Facepunch.AssemblySchema](https://github.com/Facepunch/Facepunch.AssemblySchema) — the schema format this server uses for API reference data

## License

[MIT](LICENSE)
