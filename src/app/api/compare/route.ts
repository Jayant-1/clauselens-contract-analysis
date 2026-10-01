import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { compareContracts } from "@/lib/comparison";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docAId, docBId } = body;

    if (!docAId || !docBId) {
      return NextResponse.json(
        { success: false, error: "Both docAId and docBId are required for comparison." },
        { status: 400 }
      );
    }

    if (docAId === docBId) {
      return NextResponse.json(
        { success: false, error: "Please select two distinct documents to compare." },
        { status: 400 }
      );
    }

    const [docA, docB] = await Promise.all([
      db.document.findUnique({
        where: { id: docAId },
        include: { pages: { orderBy: { pageNumber: "asc" } } },
      }),
      db.document.findUnique({
        where: { id: docBId },
        include: { pages: { orderBy: { pageNumber: "asc" } } },
      }),
    ]);

    if (!docA || !docB) {
      return NextResponse.json(
        { success: false, error: "One or both selected documents could not be found." },
        { status: 404 }
      );
    }

    // Run contract comparison
    const report = compareContracts(
      {
        id: docA.id,
        name: docA.name,
        extractedText: docA.extractedText,
        pages: docA.pages,
      },
      {
        id: docB.id,
        name: docB.name,
        extractedText: docB.extractedText,
        pages: docB.pages,
      }
    );

    // Save or update comparison record in database
    await db.comparisonRecord.upsert({
      where: {
        id: `${docA.id}_${docB.id}`,
      },
      update: {
        summary: report.summary,
        differences: JSON.stringify(report.differences),
      },
      create: {
        id: `${docA.id}_${docB.id}`,
        docAId: docA.id,
        docBId: docB.id,
        docAName: docA.name,
        docBName: docB.name,
        summary: report.summary,
        differences: JSON.stringify(report.differences),
      },
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Comparison error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to execute contract comparison.",
      },
      { status: 500 }
    );
  }
}
