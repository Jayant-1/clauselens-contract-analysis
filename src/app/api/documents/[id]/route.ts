import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
          select: { pageNumber: true, text: true },
        },
        chunks: {
          orderBy: { chunkIndex: "asc" },
          select: {
            id: true,
            chunkIndex: true,
            pageNumber: true,
            sectionTitle: true,
            content: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: "Document not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        fileType: document.fileType,
        fileSize: document.fileSize,
        filePath: document.filePath,
        fileUrl: storage.getUrl(document.filePath),
        pageCount: document.pageCount,
        totalChars: document.totalChars,
        status: document.status,
        htmlContent: document.htmlContent,
        pages: document.pages,
        chunks: document.chunks,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch document details." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: "Document not found." }, { status: 404 });
    }

    // 1. Delete physical file from storage
    if (document.filePath) {
      try {
        await storage.delete(document.filePath);
      } catch (err) {
        console.warn("Storage deletion warning:", err);
      }
    }

    // 2. Delete comparisons involving this document
    await db.comparisonRecord.deleteMany({
      where: {
        OR: [{ docAId: id }, { docBId: id }],
      },
    });

    // 3. Find and delete chat sessions associated with this document
    const sessions = await db.chatSession.findMany();
    for (const session of sessions) {
      try {
        const docIds: string[] = JSON.parse(session.documentIds);
        if (docIds.includes(id)) {
          await db.chatSession.delete({ where: { id: session.id } });
        }
      } catch {
        // ignore parse error
      }
    }

    // 4. Delete document (cascades to DocumentPage and Chunk)
    await db.document.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Document "${document.name}" and all associated data deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete document and associated data." },
      { status: 500 }
    );
  }
}
