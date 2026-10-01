import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { runAgenticResearch, ResearchStep } from "@/lib/agent/researcher";
import { ToolDocumentContext } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

// GET /api/chat: retrieve existing chat session and messages for selected documents
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const docIdsParam = searchParams.get("documentIds");

    if (sessionId) {
      const session = await db.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!session) {
        return NextResponse.json({ success: false, error: "Session not found." }, { status: 404 });
      }

      const formatted = session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations ? JSON.parse(m.citations) : [],
        researchSteps: m.researchSteps ? JSON.parse(m.researchSteps) : [],
        createdAt: m.createdAt,
      }));

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          title: session.title,
          documentIds: JSON.parse(session.documentIds),
          messages: formatted,
        },
      });
    }

    if (docIdsParam) {
      const docIds = docIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
      // Find latest session with matching documents
      const sessions = await db.chatSession.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      const matchedSession = sessions.find((s) => {
        try {
          const ids: string[] = JSON.parse(s.documentIds);
          if (ids.length !== docIds.length) return false;
          return ids.every((id) => docIds.includes(id));
        } catch {
          return false;
        }
      });

      if (matchedSession) {
        const formatted = matchedSession.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations ? JSON.parse(m.citations) : [],
          researchSteps: m.researchSteps ? JSON.parse(m.researchSteps) : [],
          createdAt: m.createdAt,
        }));

        return NextResponse.json({
          success: true,
          session: {
            id: matchedSession.id,
            title: matchedSession.title,
            documentIds: JSON.parse(matchedSession.documentIds),
            messages: formatted,
          },
        });
      }

      return NextResponse.json({ success: true, session: null });
    }

    return NextResponse.json({ success: false, error: "Either sessionId or documentIds required." }, { status: 400 });
  } catch (error) {
    console.error("Error retrieving chat:", error);
    return NextResponse.json({ success: false, error: "Failed to load chat history." }, { status: 500 });
  }
}

// POST /api/chat: stream token-by-token answer with visible activity events using SSE
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, documentIds, sessionId } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A valid question is required." },
        { status: 400 }
      );
    }

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one document must be selected for analysis." },
        { status: 400 }
      );
    }

    // Load documents, pages, and chunks
    const docs = await db.document.findMany({
      where: { id: { in: documentIds } },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        chunks: { orderBy: { chunkIndex: "asc" } },
      },
    });

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selected documents were not found in the database." },
        { status: 404 }
      );
    }

    const toolDocs: ToolDocumentContext[] = docs.map((d) => ({
      id: d.id,
      name: d.name,
      extractedText: d.extractedText,
      pages: d.pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
      chunks: d.chunks.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber,
        sectionTitle: c.sectionTitle,
        content: c.content,
        normalizedContent: c.normalizedContent,
        startChar: c.startChar,
        endChar: c.endChar,
      })),
    }));

    // Find or create ChatSession
    let session = sessionId
      ? await db.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      const docNames = docs.map((d) => d.name).join(", ");
      const title =
        docNames.length > 40 ? `${docNames.slice(0, 37)}...` : docNames;

      session = await db.chatSession.create({
        data: {
          title: `Analysis: ${title}`,
          documentIds: JSON.stringify(documentIds),
        },
      });
    }

    // Persist user question
    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: question.trim(),
      },
    });

    // Create placeholder assistant message record to receive streaming content
    const assistantMessage = await db.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: "",
      },
    });

    // Prepare Server-Sent Events stream
    const encoder = new TextEncoder();
    let accumulatedContent = "";
    const collectedSteps: ResearchStep[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        function emit(event: string, data: unknown) {
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // controller might have been closed by client disconnect
          }
        }

        try {
          // Send initial metadata
          emit("init", {
            sessionId: session.id,
            userMessageId: "msg_user",
            assistantMessageId: assistantMessage.id,
          });

          // Run agentic research with live callbacks
          const response = await runAgenticResearch(question, toolDocs, {
            onStep: (step) => {
              collectedSteps.push(step);
              emit("step", step);
            },
            onToken: (token) => {
              accumulatedContent += token;
              emit("token", { token });
            },
          });

          // Update final assistant message in database
          await db.chatMessage.update({
            where: { id: assistantMessage.id },
            data: {
              content: response.answer || accumulatedContent,
              citations: JSON.stringify(response.citations),
              researchSteps: JSON.stringify(response.steps),
            },
          });

          // Update session updated timestamp
          await db.chatSession.update({
            where: { id: session.id },
            data: { updatedAt: new Date() },
          });

          // Send final completion event
          emit("done", {
            messageId: assistantMessage.id,
            answer: response.answer || accumulatedContent,
            citations: response.citations,
            steps: response.steps,
            isGrounded: response.isGrounded,
          });

          controller.close();
        } catch (streamErr: unknown) {
          console.error("Streaming research error:", streamErr);

          // If stopped by user, preserve partially generated content in DB
          if (accumulatedContent) {
            await db.chatMessage.update({
              where: { id: assistantMessage.id },
              data: {
                content: accumulatedContent,
                researchSteps: JSON.stringify(collectedSteps),
              },
            });
          }

          emit("error", {
            error:
              streamErr instanceof Error
                ? streamErr.message
                : "An unexpected error occurred during research.",
            partialAnswer: accumulatedContent,
          });

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initiate contract chat.",
      },
      { status: 500 }
    );
  }
}
