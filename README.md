# sbox-mcp-documentation

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that provides AI assistants with searchable access to the full **s&box** game engine documentation — 180+ pages of guides, tutorials, and concepts.

> **npm registry:** Publishing to npm is planned for an upcoming release. For now, use the [local checkout](#install-from-source) method below.

## Features

- **Full-text search** across all s&box documentation with fuzzy matching and relevance ranking
- **Direct page retrieval** with chunked reading for large pages
- **Category browsing** to discover available documentation topics
- **Automatic caching** with configurable TTL (default 4 hours) — no repeated API calls
- **Background indexing** on startup so the first query returns results immediately
- **Built-in self-tests** to verify the server is working correctly

## Data Source

Documentation is fetched from the official [Facepunch docs](https://docs.facepunch.com/s/sbox-dev) via the Outline wiki API, which returns raw Markdown directly. The server crawls the full document tree (~202 entries, 180+ with content) and builds a local search index using [MiniSearch](https://lucaong.github.io/minisearch/).

## Install from Source

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
            "command": "node",
            "args": ["<path-to-repo>/dist/index.js"]
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
            "command": "node",
            "args": ["<path-to-repo>/dist/index.js"]
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
            "command": "node",
            "args": ["<path-to-repo>/dist/index.js"]
        }
    }
}
```

Replace `<path-to-repo>` with the absolute path to your cloned repository.

## Tools

| Tool | Description |
|------|-------------|
| `sbox_search_docs` | Search documentation with fuzzy matching. Returns titles, URLs, categories, and relevant snippets. Supports category filtering and result limits. |
| `sbox_get_doc_page` | Fetch a specific documentation page as Markdown. Supports chunked reading via `start_index` and `max_length` for large pages. |
| `sbox_list_doc_categories` | List all documentation categories with page counts. Useful for discovering what topics are available. |
| `sbox_cache_status` | Show cache and index health — page counts, freshness, and whether indexing is complete. |
| `sbox_run_tests` | Run built-in self-tests for cache, search, and crawler modules. Returns pass/fail results per test case. |

## Architecture

```
docs.facepunch.com (Outline API)
        │
        ▼
   DocCrawler ──► POST /api/shares.info   (document tree, 202 entries)
        │         POST /api/documents.info (raw Markdown per page)
        │
        ▼
    DocCache ──► ~/.sbox-docs-mcp/cache/manifest.json
        │        TTL-based expiration (default 4h)
        │
        ▼
   DocSearch ──► MiniSearch index
                 Weighted fields: title (3x), category (2x), content (1x)
                 Fuzzy matching (0.2) + prefix search
```

### Cache Behavior

- **Location:** `~/.sbox-docs-mcp/cache/`
- **TTL:** 4 hours (configurable via `SBOX_DOCS_CACHE_TTL` env var, in seconds)
- **Custom directory:** Set `SBOX_DOCS_CACHE_DIR` env var
- Cache is populated on server startup in the background
- Individual pages can be fetched on-demand if not yet cached

## Related Projects

- [sbox-api-mcp](https://github.com/SofianeBel/sbox-api-mcp) — MCP server for s&box API type reference (1,800+ types, 15,000+ members). Complements this server: use `sbox-api-mcp` for exact API signatures, use `sbox-mcp-documentation` for guides and concepts.

## License

[MIT](LICENSE)
