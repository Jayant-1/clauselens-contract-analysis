import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { POST as uploadDoc, GET as listDocs } from "@/app/api/documents/route";
import { GET as getDoc, DELETE as deleteDoc } from "@/app/api/documents/[id]/route";
import { POST as compareDocs } from "@/app/api/compare/route";
import { POST as chatApi } from "@/app/api/chat/route";
import db from "@/lib/db";

describe("End-to-End API Workflows & Validation", () => {
  const fixturesDir = path.join(process.cwd(), "fixtures", "contracts");
  let uploadedPdfId = "";
  let uploadedDocx1Id = "";
  let uploadedDocx2Id = "";

  beforeAll(async () => {
    // Clean up any test records in db
    await db.chatMessage.deleteMany();
    await db.chatSession.deleteMany();
    await db.comparisonRecord.deleteMany();
    await db.chunk.deleteMany();
    await db.documentPage.deleteMany();
    await db.document.deleteMany();
  });

  it("1. Rejects invalid file formats with clear error message", async () => {
    const fakeFile = new File(["fake binary data"], "contract.exe", { type: "application/x-msdownload" });
    const formData = new FormData();
    formData.append("file", fakeFile);

    const req = new NextRequest("http://localhost:3000/api/documents", {
      method: "POST",
      body: formData,
    });

    const res = await uploadDoc(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Unsupported file format");
  });

  it("2. Rejects scanned / image-only PDFs with no readable text", async () => {
    const scannedBytes = await fs.readFile(path.join(fixturesDir, "scanned_sample.pdf"));
    const file = new File([scannedBytes], "scanned_sample.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/documents", {
      method: "POST",
      body: formData,
    });

    const res = await uploadDoc(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("OCR is not available");
  });

  it("3. Successfully uploads and chunks a valid multi-page PDF contract", async () => {
    const pdfBytes = await fs.readFile(path.join(fixturesDir, "sample_contract.pdf"));
    const file = new File([pdfBytes], "sample_contract.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/documents", {
      method: "POST",
      body: formData,
    });

    const res = await uploadDoc(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.document.id).toBeTruthy();
    expect(data.document.fileType).toBe("pdf");
    expect(data.document.pageCount).toBe(2);
    expect(data.document.chunkCount).toBeGreaterThan(0);

    uploadedPdfId = data.document.id;
  });

  it("4. Successfully uploads and parses valid DOCX contracts (v1 and v2)", async () => {
    const docx1Bytes = await fs.readFile(path.join(fixturesDir, "saas_agreement_v1.docx"));
    const file1 = new File([docx1Bytes], "saas_agreement_v1.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const fd1 = new FormData();
    fd1.append("file", file1);

    const res1 = await uploadDoc(new NextRequest("http://localhost:3000/api/documents", { method: "POST", body: fd1 }));
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    uploadedDocx1Id = data1.document.id;

    const docx2Bytes = await fs.readFile(path.join(fixturesDir, "saas_agreement_v2.docx"));
    const file2 = new File([docx2Bytes], "saas_agreement_v2.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const fd2 = new FormData();
    fd2.append("file", file2);

    const res2 = await uploadDoc(new NextRequest("http://localhost:3000/api/documents", { method: "POST", body: fd2 }));
    const data2 = await res2.json();
    expect(data2.success).toBe(true);
    uploadedDocx2Id = data2.document.id;
  });

  it("5. Lists uploaded documents with accurate metadata", async () => {
    const res = await listDocs();
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.documents.length).toBe(3);
  });

  it("6. Retrieves document detail with pages, chunks, and file URL", async () => {
    const params = Promise.resolve({ id: uploadedPdfId });
    const req = new NextRequest(`http://localhost:3000/api/documents/${uploadedPdfId}`);
    const res = await getDoc(req, { params });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.document.id).toBe(uploadedPdfId);
    expect(data.document.pages.length).toBe(2);
    expect(data.document.chunks.length).toBeGreaterThan(0);
    expect(data.document.fileUrl).toContain("sample_contract.pdf");
  });

  it("7. Executes multi-document agentic research chat with streamed SSE events and verified citations", async () => {
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "What is the liability cap and governing law in both agreements?",
        documentIds: [uploadedDocx1Id, uploadedDocx2Id],
      }),
    });

    const res = await chatApi(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    // Read stream events
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let streamText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      streamText += decoder.decode(value);
    }

    expect(streamText).toContain("event: init");
    expect(streamText).toContain("event: step");
    expect(streamText).toContain("event: token");
    expect(streamText).toContain("event: done");
    expect(streamText).toContain("citations");
  });

  it("8. Compares contract v1 and v2, detecting substantive changes and significance ratings", async () => {
    const req = new NextRequest("http://localhost:3000/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docAId: uploadedDocx1Id,
        docBId: uploadedDocx2Id,
      }),
    });

    const res = await compareDocs(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.report.stats.highSignificanceCount).toBeGreaterThanOrEqual(1);
    expect(data.report.differences.some((d: { significance: string }) => d.significance === "high")).toBe(true);
    expect(data.report.summary).toContain("Limitation of Liability");
  });

  it("9. Deletes document and cascades cleanup of chunks, pages, and chat sessions", async () => {
    const params = Promise.resolve({ id: uploadedPdfId });
    const req = new NextRequest(`http://localhost:3000/api/documents/${uploadedPdfId}`, {
      method: "DELETE",
    });

    const res = await deleteDoc(req, { params });
    const data = await res.json();

    expect(data.success).toBe(true);

    // Verify document was removed from database
    const checkDoc = await db.document.findUnique({ where: { id: uploadedPdfId } });
    expect(checkDoc).toBeNull();

    // Verify chunks were cascaded
    const checkChunks = await db.chunk.findMany({ where: { documentId: uploadedPdfId } });
    expect(checkChunks.length).toBe(0);
  });
});
