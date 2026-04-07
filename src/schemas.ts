import { z } from "zod";

export const SearchDocsInput = z.object({
    query: z.string().min(1).describe("Search terms to find in the documentation"),
    limit: z
        .number()
        .min(1)
        .max(25)
        .default(10)
        .describe("Maximum number of results (default: 10, max: 25)"),
    category: z
        .string()
        .optional()
        .describe("Optional category filter (e.g. 'systems', 'about', 'scenes')"),
});

export const GetDocPageInput = z.object({
    url: z
        .string()
        .describe("Full URL of the documentation page (from docs.facepunch.com/s/sbox-dev/doc/...)"),
    start_index: z
        .number()
        .min(0)
        .default(0)
        .describe("Character offset to start reading from (default: 0)"),
    max_length: z
        .number()
        .min(100)
        .max(20000)
        .default(5000)
        .describe("Maximum content length in characters (default: 5000)"),
});

export const ListCategoriesInput = z
    .object({})
    .describe("No parameters required");

export type SearchDocsParams = z.infer<typeof SearchDocsInput>;
export type GetDocPageParams = z.infer<typeof GetDocPageInput>;
