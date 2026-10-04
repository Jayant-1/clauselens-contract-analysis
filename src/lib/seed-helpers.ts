import fs from "fs/promises";
import path from "path";
import db from "./db";
import { parseDocument } from "./document-parser";
import { chunkDocument } from "./chunking";
import { storage } from "./storage";

export async function seedDefaultContractsIfEmpty(): Promise<void> {
  try {
    const count = await db.document.count();
    if (count > 0) return;

    const fixtures = [
      { name: "saas_agreement_v1.docx", file: "saas_agreement_v1.docx" },
      { name: "saas_agreement_v2.docx", file: "saas_agreement_v2.docx" },
    ];

    for (const f of fixtures) {
      try {
        const filePath = path.join(process.cwd(), "fixtures", "contracts", f.file);
        const buffer = await fs.readFile(filePath);
        const parsedDoc = await parseDocument(buffer, f.name);
        const storageKey = `${Date.now()}_${f.name}`;
        await storage.save(storageKey, buffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

        const document = await db.document.create({
          data: {
            name: f.name,
            fileType: parsedDoc.fileType,
            fileSize: buffer.length,
            filePath: storageKey,
            pageCount: parsedDoc.pageCount,
            totalChars: parsedDoc.totalChars,
            status: "ready",
            extractedText: parsedDoc.extractedText,
            normalizedText: parsedDoc.normalizedText,
            htmlContent: parsedDoc.htmlContent,
            pages: {
              create: parsedDoc.pages.map((p) => ({
                pageNumber: p.pageNumber,
                text: p.text,
                normalizedText: p.normalizedText,
              })),
            },
          },
        });

        const chunks = chunkDocument(document.id, parsedDoc.pages);
        if (chunks.length > 0) {
          await db.chunk.createMany({
            data: chunks.map((c) => ({
              id: c.id,
              documentId: document.id,
              chunkIndex: c.chunkIndex,
              pageNumber: c.pageNumber,
              sectionTitle: c.sectionTitle,
              content: c.content,
              normalizedContent: c.normalizedContent,
              startChar: c.startChar,
              endChar: c.endChar,
            })),
          });
        }
      } catch (err) {
        console.warn(`Failed to seed contract ${f.name}:`, err);
      }
    }
  } catch (err) {
    console.warn("seedDefaultContractsIfEmpty check error:", err);
  }
}
