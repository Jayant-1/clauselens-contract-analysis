import { z } from "zod";
import { DocumentChunk, extractSectionTitle } from "../chunking";
import { searchChunks, buildChunkIndex } from "../retrieval";

// Tool input schemas validated with Zod
export const SearchDocumentSchema = z.object({
  query: z.string().min(1, "Query must not be empty"),
  documentIds: z.array(z.string()).optional(),
});

export const GetSectionSchema = z.object({
  documentId: z.string().min(1, "Document ID must not be empty"),
  sectionId: z.string().min(1, "Section ID must not be empty"),
});

export const ListClausesSchema = z.object({
  documentId: z.string().min(1, "Document ID must not be empty"),
});

export type SearchDocumentArgs = z.infer<typeof SearchDocumentSchema>;
export type GetSectionArgs = z.infer<typeof GetSectionSchema>;
export type ListClausesArgs = z.infer<typeof ListClausesSchema>;

export interface ToolDocumentContext {
  id: string;
  name: string;
  extractedText: string;
  pages: Array<{ pageNumber: number; text: string }>;
  chunks: DocumentChunk[];
}

export interface ToolCallExecutionResult {
  toolName: string;
  success: boolean;
  activityMessage: string;
  output: string;
  rawResult?: unknown;
}

/**
 * OpenAI-compatible tool specifications
 */
export const CONTRACT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_document",
      description:
        "Searches contract documents for specific clauses, terms, numbers, or provisions using BM25 lexical retrieval.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query keywords or clause topic (e.g. 'limitation of liability', 'governing law').",
          },
          documentIds: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of document IDs to restrict search to.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_section",
      description: "Retrieves the full verbatim text of a specific section, clause heading, or chunk ID from a document.",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "The document ID.",
          },
          sectionId: {
            type: "string",
            description: "The section heading name (e.g. 'Section 4. Limitation of Liability') or chunk ID.",
          },
        },
        required: ["documentId", "sectionId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clauses",
      description: "Lists all clause headings, sections, and page locations in a contract document.",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "The document ID.",
          },
        },
        required: ["documentId"],
      },
    },
  },
];

/**
 * Executes a tool call safely, validating arguments and handling malformed/nonsensical calls gracefully.
 */
export function executeTool(
  toolName: string,
  rawArgs: unknown,
  docs: ToolDocumentContext[]
): ToolCallExecutionResult {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Agent Tool Call] ${toolName}:`, typeof rawArgs === "string" ? rawArgs : JSON.stringify(rawArgs));
  }

  // Parse arguments safely if string
  let parsedArgs: unknown = rawArgs;
  if (typeof rawArgs === "string") {
    try {
      parsedArgs = JSON.parse(rawArgs);
    } catch (e: unknown) {
      return {
        toolName,
        success: false,
        activityMessage: `Malformed JSON arguments for ${toolName}`,
        output: JSON.stringify({
          error: true,
          message: `Malformed JSON arguments: ${e instanceof Error ? e.message : String(e)}`,
        }),
      };
    }
  }

  switch (toolName) {
    case "search_document": {
      const validation = SearchDocumentSchema.safeParse(parsedArgs);
      if (!validation.success) {
        return {
          toolName,
          success: false,
          activityMessage: "Invalid search arguments",
          output: JSON.stringify({
            error: true,
            message: "Missing or invalid search arguments. 'query' string is required.",
            issues: validation.error.issues,
          }),
        };
      }

      const { query, documentIds } = validation.data;
      const targetDocs =
        documentIds && documentIds.length > 0
          ? docs.filter((d) => documentIds.includes(d.id))
          : docs;

      const allChunks = targetDocs.flatMap((d) => d.chunks);
      if (allChunks.length === 0) {
        return {
          toolName,
          success: true,
          activityMessage: `Searching for "${query}" (no chunks found)`,
          output: JSON.stringify({
            resultsCount: 0,
            message: "No document chunks available for search.",
            results: [],
          }),
        };
      }

      const index = buildChunkIndex(allChunks);
      const results = searchChunks(index, allChunks, {
        query,
        documentIds: targetDocs.map((d) => d.id),
        limit: 5,
      });

      const docNameMap = new Map(docs.map((d) => [d.id, d.name]));
      const formatted = results.map((r) => ({
        chunkId: r.id,
        documentId: r.documentId,
        documentName: docNameMap.get(r.documentId) || r.documentId,
        pageNumber: r.pageNumber,
        sectionTitle: r.sectionTitle,
        content: r.content,
        relevanceScore: Math.round(r.score * 100) / 100,
      }));

      const multiDocNote =
        targetDocs.length > 1 ? ` across ${targetDocs.length} documents` : "";

      return {
        toolName,
        success: true,
        activityMessage: `Searching for "${query}"${multiDocNote}...`,
        output: JSON.stringify({
          query,
          resultsCount: formatted.length,
          results: formatted,
        }),
        rawResult: formatted,
      };
    }

    case "get_section": {
      const validation = GetSectionSchema.safeParse(parsedArgs);
      if (!validation.success) {
        return {
          toolName,
          success: false,
          activityMessage: "Invalid get_section arguments",
          output: JSON.stringify({
            error: true,
            message: "Missing or invalid get_section arguments. 'documentId' and 'sectionId' are required.",
            issues: validation.error.issues,
          }),
        };
      }

      const { documentId, sectionId } = validation.data;
      const doc = docs.find((d) => d.id === documentId);
      if (!doc) {
        return {
          toolName,
          success: false,
          activityMessage: `Reading section "${sectionId}" (document not found)`,
          output: JSON.stringify({
            error: true,
            message: `Document with ID "${documentId}" was not found in the selected context.`,
          }),
        };
      }

      // Check chunk ID direct match
      const directChunk = doc.chunks.find((c) => c.id === sectionId);
      if (directChunk) {
        return {
          toolName,
          success: true,
          activityMessage: `Reading "${directChunk.sectionTitle}" on Page ${directChunk.pageNumber}...`,
          output: JSON.stringify({
            documentId: doc.id,
            documentName: doc.name,
            sectionTitle: directChunk.sectionTitle,
            pageNumber: directChunk.pageNumber,
            content: directChunk.content,
          }),
        };
      }

      // Check section title match
      const matchingChunks = doc.chunks.filter((c) =>
        c.sectionTitle.toLowerCase().includes(sectionId.toLowerCase())
      );

      if (matchingChunks.length > 0) {
        const fullSectionText = matchingChunks.map((c) => c.content).join("\n\n");
        return {
          toolName,
          success: true,
          activityMessage: `Reading section "${matchingChunks[0].sectionTitle}"...`,
          output: JSON.stringify({
            documentId: doc.id,
            documentName: doc.name,
            sectionTitle: matchingChunks[0].sectionTitle,
            pageNumber: matchingChunks[0].pageNumber,
            content: fullSectionText,
          }),
        };
      }

      // Check page text fallback for section heading
      for (const page of doc.pages) {
        const lines = page.text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes(sectionId.toLowerCase())) {
            const sectionLines = lines.slice(i, i + 10).join("\n");
            return {
              toolName,
              success: true,
              activityMessage: `Reading section "${line.trim()}"...`,
              output: JSON.stringify({
                documentId: doc.id,
                documentName: doc.name,
                sectionTitle: line.trim(),
                pageNumber: page.pageNumber,
                content: sectionLines,
              }),
            };
          }
        }
      }

      return {
        toolName,
        success: false,
        activityMessage: `Section "${sectionId}" not found in ${doc.name}`,
        output: JSON.stringify({
          error: true,
          message: `Section or chunk matching "${sectionId}" was not found in document "${doc.name}".`,
        }),
      };
    }

    case "list_clauses": {
      const validation = ListClausesSchema.safeParse(parsedArgs);
      if (!validation.success) {
        return {
          toolName,
          success: false,
          activityMessage: "Invalid list_clauses arguments",
          output: JSON.stringify({
            error: true,
            message: "Missing or invalid list_clauses arguments. 'documentId' is required.",
            issues: validation.error.issues,
          }),
        };
      }

      const { documentId } = validation.data;
      const doc = docs.find((d) => d.id === documentId);
      if (!doc) {
        return {
          toolName,
          success: false,
          activityMessage: `Listing clauses (document not found)`,
          output: JSON.stringify({
            error: true,
            message: `Document with ID "${documentId}" was not found.`,
          }),
        };
      }

      const clauses: Array<{ chunkId: string; sectionTitle: string; pageNumber: number }> = [];
      const seen = new Set<string>();

      for (const c of doc.chunks) {
        if (!seen.has(c.sectionTitle)) {
          seen.add(c.sectionTitle);
          clauses.push({
            chunkId: c.id,
            sectionTitle: c.sectionTitle,
            pageNumber: c.pageNumber,
          });
        }
      }

      // Also scan page lines for any clause headings
      for (const page of doc.pages) {
        const lines = page.text.split(/\r?\n/);
        for (const line of lines) {
          const heading = extractSectionTitle(line);
          if (heading && !seen.has(heading)) {
            seen.add(heading);
            clauses.push({
              chunkId: `${doc.id}_sec_${clauses.length}`,
              sectionTitle: heading,
              pageNumber: page.pageNumber,
            });
          }
        }
      }

      return {
        toolName,
        success: true,
        activityMessage: `Listing clauses for ${doc.name}...`,
        output: JSON.stringify({
          documentId: doc.id,
          documentName: doc.name,
          clauseCount: clauses.length,
          clauses,
        }),
      };
    }

    default:
      return {
        toolName,
        success: false,
        activityMessage: `Unknown tool requested: ${toolName}`,
        output: JSON.stringify({
          error: true,
          message: `Tool "${toolName}" does not exist. Available tools: search_document, get_section, list_clauses.`,
        }),
      };
  }
}
