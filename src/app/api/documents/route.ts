import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { storage } from "@/lib/storage";
import { parseDocument, validateFileFormat } from "@/lib/document-parser";
import { chunkDocument } from "@/lib/chunking";
import { seedDefaultContractsIfEmpty } from "@/lib/seed-helpers";

export const dynamic = "force-dynamic";

// GET /api/documents: list all uploaded documents
export async function GET() {
  try {
    let documents = await db.document.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        fileType: true,
        fileSize: true,
        filePath: true,
        pageCount: true,
        totalChars: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (documents.length === 0) {
      await seedDefaultContractsIfEmpty();
      documents = await db.document.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          fileType: true,
          fileSize: true,
          filePath: true,
          pageCount: true,
          totalChars: true,
          status: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { chunks: true },
          },
        },
      });
    }

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents from database." },
      { status: 500 }
    );
  }
}

// POST /api/documents: upload and process a PDF or DOCX contract
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was provided in the upload request." },
        { status: 400 }
      );
    }

    const filename = file.name;
    const mimeType = file.type;

    // Validate file format
    try {
      validateFileFormat(filename, mimeType);
    } catch (valErr) {
      return NextResponse.json(
        {
          success: false,
          error: valErr instanceof Error ? valErr.message : "Unsupported file format.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse and extract document
    let parsedDoc;
    try {
      parsedDoc = await parseDocument(buffer, filename, mimeType);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : "Failed to extract document text.";
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }

    // Save file to storage abstraction
    const storageKey = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    await storage.save(storageKey, buffer, mimeType || "application/octet-stream");

    // Persist Document to database
    const document = await db.document.create({
      data: {
        name: filename,
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

    // Chunk document and persist chunks
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

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        fileSize: document.fileSize,
        pageCount: document.pageCount,
        totalChars: document.totalChars,
        chunkCount: chunks.length,
        createdAt: document.createdAt,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "An unexpected error occurred during document upload.",
      },
      { status: 500 }
    );
  }
}
