import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);

    const buffer = await storage.get(decodedKey);

    const isPdf = decodedKey.toLowerCase().endsWith(".pdf");
    const contentType = isPdf
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const response = new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(decodedKey)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });

    return response;
  } catch (error) {
    console.error("Error serving document file:", error);
    return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
  }
}
