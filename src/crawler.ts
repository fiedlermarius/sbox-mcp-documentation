import { DocCache, type CachedPage } from "./cache.js";

const OUTLINE_API = "https://docs.facepunch.com/api";
const SHARE_ID = "sbox-dev";
const DOCS_BASE = "https://docs.facepunch.com/s/sbox-dev";
const REQUEST_DELAY_MS = 100;
const REQUEST_TIMEOUT_MS = 15000;

interface TreeNode {
    id: string;
    url: string;
    title: string;
    icon?: string;
    emoji?: string;
    children?: TreeNode[];
}

async function apiPost(endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(`${OUTLINE_API}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const json = (await res.json()) as { data?: unknown };
        return json.data ?? null;
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function flattenTree(
    node: TreeNode,
    parentPath: string = ""
): Array<{ id: string; title: string; path: string; url: string }> {
    const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
    const result = [{ id: node.id, title: node.title, path: currentPath, url: node.url }];
    if (node.children) {
        for (const child of node.children) {
            result.push(...flattenTree(child, currentPath));
        }
    }
    return result;
}

function extractCategory(path: string): string {
    // Path: "S&box Documentation/Systems/Input/Controller Input"
    // Category = second level after root
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 2) return parts[1]!;
    return "root";
}

export interface CrawlStats {
    crawled: number;
    failed: number;
    fromCache: number;
    total: number;
}

export class DocCrawler {
    private cache: DocCache;
    private shareUuid: string | null = null;
    private docTree: Array<{ id: string; title: string; path: string; url: string }> = [];

    // --- Self-Test (pure functions only, no network) ---
    static runSelfTest(): { passed: string[]; failed: string[] } {
        const passed: string[] = [];
        const failed: string[] = [];

        function assert(name: string, condition: boolean) {
            (condition ? passed : failed).push(name);
        }

        // Test: flattenTree
        const tree: TreeNode = {
            id: "root", url: "/doc/root", title: "Root",
            children: [
                {
                    id: "a", url: "/doc/a", title: "Alpha", children: [
                        { id: "a1", url: "/doc/a1", title: "Alpha One" },
                    ]
                },
                { id: "b", url: "/doc/b", title: "Beta" },
            ],
        };
        const flat = flattenTree(tree);
        assert("flattenTree returns 4 nodes", flat.length === 4);
        assert("flattenTree root path", flat[0]?.path === "Root");
        assert("flattenTree nested path", flat[2]?.path === "Root/Alpha/Alpha One");
        assert("flattenTree preserves ids", flat[1]?.id === "a");
        assert("flattenTree preserves urls", flat[3]?.url === "/doc/b");

        // Test: extractCategory
        assert("extractCategory 4-part path", extractCategory("Root/Systems/Input/Controller") === "Systems");
        assert("extractCategory 2-part path", extractCategory("Root/About") === "About");
        assert("extractCategory 1-part path", extractCategory("Root") === "root");
        assert("extractCategory empty string", extractCategory("") === "root");

        return { passed, failed };
    }

    constructor(cache: DocCache) {
        this.cache = cache;
    }

    private async loadTree(): Promise<boolean> {
        const data = (await apiPost("shares.info", { id: SHARE_ID })) as {
            shares: Array<{ id: string }>;
            sharedTree: TreeNode;
        } | null;

        if (!data?.sharedTree || !data.shares?.[0]) return false;

        this.shareUuid = data.shares[0].id;
        this.docTree = flattenTree(data.sharedTree);
        return true;
    }

    private async fetchDoc(
        docId: string
    ): Promise<{ title: string; text: string; updatedAt?: string } | null> {
        const data = (await apiPost("documents.info", {
            id: docId,
            shareId: this.shareUuid,
        })) as { title: string; text: string; updatedAt?: string } | null;

        return data;
    }

    async crawlAll(
        onProgress?: (stats: CrawlStats) => void
    ): Promise<CrawlStats> {
        // If cache is fresh, skip crawling
        if (this.cache.isFresh()) {
            const count = this.cache.getPageCount();
            return { crawled: 0, failed: 0, fromCache: count, total: count };
        }

        const stats: CrawlStats = { crawled: 0, failed: 0, fromCache: 0, total: 0 };

        // Load the document tree from the Outline API
        const treeLoaded = await this.loadTree();
        if (!treeLoaded) {
            process.stderr.write(
                "\n[sbox-docs-mcp] ERROR: Could not load document tree from docs.facepunch.com\n"
            );
            stats.fromCache = this.cache.getPageCount();
            return stats;
        }

        stats.total = this.docTree.length;

        process.stderr.write(
            `\n[sbox-docs-mcp] Found ${this.docTree.length} docs in tree\n`
        );

        for (const doc of this.docTree) {
            const fullUrl = `${DOCS_BASE}${doc.url}`;

            // Check page-level cache
            if (this.cache.isPageFresh(fullUrl)) {
                stats.fromCache++;
                onProgress?.(stats);
                continue;
            }

            const fetched = await this.fetchDoc(doc.id);
            if (!fetched || !fetched.text || fetched.text.length < 10) {
                stats.failed++;
                onProgress?.(stats);
                await delay(REQUEST_DELAY_MS);
                continue;
            }

            const page: CachedPage = {
                url: fullUrl,
                title: fetched.title || doc.title,
                category: extractCategory(doc.path),
                markdown: fetched.text,
                fetchedAt: Date.now(),
                lastUpdated: fetched.updatedAt,
            };

            this.cache.setPage(page);
            stats.crawled++;
            onProgress?.(stats);
            await delay(REQUEST_DELAY_MS);
        }

        // Prune cached pages that are no longer in the doc tree
        const validUrls = new Set(this.docTree.map((d) => `${DOCS_BASE}${d.url}`));
        const pruned = this.cache.removePagesNotIn(validUrls);
        if (pruned > 0) {
            process.stderr.write(
                `\n[sbox-docs-mcp] Pruned ${pruned} stale page(s) from cache\n`
            );
        }

        this.cache.markFullCrawl();
        this.cache.save();
        return stats;
    }

    async crawlSinglePage(url: string): Promise<CachedPage | null> {
        // Check cache first
        if (this.cache.isPageFresh(url)) {
            return this.cache.getPage(url) || null;
        }

        // We need the tree to resolve URL -> document ID
        if (this.docTree.length === 0) {
            await this.loadTree();
        }

        // URL: https://docs.facepunch.com/s/sbox-dev/doc/controller-input-T0B8XRcyf1
        const urlPath = url.replace(DOCS_BASE, "");
        const treeEntry = this.docTree.find((d) => d.url === urlPath);

        if (!treeEntry) return null;

        const fetched = await this.fetchDoc(treeEntry.id);
        if (!fetched || !fetched.text) return null;

        const page: CachedPage = {
            url,
            title: fetched.title || treeEntry.title,
            category: extractCategory(treeEntry.path),
            markdown: fetched.text,
            fetchedAt: Date.now(),
            lastUpdated: fetched.updatedAt,
        };

        this.cache.setPage(page);
        this.cache.save();
        return page;
    }
}
