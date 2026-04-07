#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { DocCache } from "./cache.js";
import { DocCrawler } from "./crawler.js";
import { DocSearch } from "./search.js";
import { z } from "zod";
import {
    SearchDocsInput,
    GetDocPageInput,
    ListCategoriesInput,
} from "./schemas.js";
import { handleSearchDocs } from "./tools/searchDocs.js";
import { handleGetDocPage } from "./tools/getDocPage.js";
import { handleListCategories } from "./tools/listCategories.js";

const cache = new DocCache();
const crawler = new DocCrawler(cache);
const search = new DocSearch();

const server = new McpServer({
    name: "sbox-docs-mcp",
    version: "0.1.0",
});

// --- Tool: sbox_search_docs ---
server.tool(
    "sbox_search_docs",
    "Search s&box documentation for guides, tutorials, and concepts. Returns matching pages with titles, URLs, and relevant snippets.",
    SearchDocsInput.shape,
    async (params) => {
        await ensureIndexed();
        return handleSearchDocs(search, params);
    }
);

// --- Tool: sbox_get_doc_page ---
server.tool(
    "sbox_get_doc_page",
    "Fetch a specific s&box documentation page and return its content as Markdown. Supports chunked reading for large pages via start_index and max_length.",
    GetDocPageInput.shape,
    async (params) => {
        await ensureIndexed();
        return handleGetDocPage(search, crawler, params);
    }
);

// --- Tool: sbox_list_doc_categories ---
server.tool(
    "sbox_list_doc_categories",
    "List all available s&box documentation categories with page counts. Use this to discover what documentation is available before searching.",
    ListCategoriesInput.shape,
    async () => {
        await ensureIndexed();
        return handleListCategories(search);
    }
);

// --- Tool: sbox_cache_status ---
server.tool(
    "sbox_cache_status",
    "Show the current status of the documentation cache and search index. Use this to verify the MCP server is running and has indexed documentation.",
    z.object({}).shape,
    async () => {
        const cacheCount = cache.getPageCount();
        const indexCount = search.pageCount;
        const isFresh = cache.isFresh();
        const lines = [
            `## S&box Docs MCP — Cache Status\n`,
            `- **Index ready:** ${indexReady ? "Yes" : "No (still crawling...)"}`,
            `- **Pages in cache:** ${cacheCount}`,
            `- **Pages in search index:** ${indexCount}`,
            `- **Cache fresh:** ${isFresh ? "Yes" : "No (will re-crawl on next use)"}`,
        ];
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
);

// --- Tool: sbox_run_tests ---
server.tool(
    "sbox_run_tests",
    "Run built-in self-tests for the cache, search index, and crawler. Returns pass/fail results for each test case.",
    z.object({}).shape,
    async () => {
        const results = [
            { module: "DocCache", ...DocCache.runSelfTest() },
            { module: "DocSearch", ...DocSearch.runSelfTest() },
            { module: "DocCrawler", ...DocCrawler.runSelfTest() },
        ];

        const lines = [`## Self-Test Results\n`];
        let totalPassed = 0;
        let totalFailed = 0;

        for (const r of results) {
            totalPassed += r.passed.length;
            totalFailed += r.failed.length;
            const icon = r.failed.length === 0 ? "\u2705" : "\u274c";
            lines.push(`### ${icon} ${r.module} — ${r.passed.length} passed, ${r.failed.length} failed\n`);
            for (const p of r.passed) lines.push(`- \u2705 ${p}`);
            for (const f of r.failed) lines.push(`- \u274c ${f}`);
            lines.push("");
        }

        lines.push(`---\n**Total: ${totalPassed} passed, ${totalFailed} failed**`);

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    }
);

// --- Initialization ---
let indexReady = false;
let indexPromise: Promise<void> | null = null;

async function ensureIndexed(): Promise<void> {
    if (indexReady) return;
    if (indexPromise) return indexPromise;
    indexPromise = doIndex();
    return indexPromise;
}

async function doIndex(): Promise<void> {
    await cache.init();

    const stats = await crawler.crawlAll((s) => {
        process.stderr.write(
            `\r[sbox-docs-mcp] Crawling... ${s.crawled} fetched, ${s.fromCache} cached, ${s.failed} failed`
        );
    });

    process.stderr.write(
        `\n[sbox-docs-mcp] Crawl complete: ${stats.crawled} fetched, ${stats.fromCache} cached, ${stats.failed} failed\n`
    );

    const pages = cache.getAllPages();
    search.buildIndex(pages);
    process.stderr.write(
        `[sbox-docs-mcp] Search index ready: ${pages.length} pages indexed\n`
    );
    indexReady = true;
}

// --- Start ---
async function main(): Promise<void> {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("[sbox-docs-mcp] Server started on stdio\n");

    // Begin crawling + indexing immediately so the first query doesn't return empty
    ensureIndexed().catch((err) => {
        process.stderr.write(`[sbox-docs-mcp] Background index error: ${err}\n`);
    });
}

main().catch((err) => {
    process.stderr.write(`[sbox-docs-mcp] Fatal error: ${err}\n`);
    process.exit(1);
});
