import { OpenAI } from "openai";
import { CONTRACT_TOOLS, executeTool, ToolDocumentContext } from "./tools";
import { verifyQuote, DocumentVerificationTarget } from "../normalization";

export interface ResearchStep {
  id: string;
  round: number;
  tool: string;
  message: string;
  input?: unknown;
  output?: string;
  status: "running" | "completed" | "error";
  timestamp: number;
}

export interface VerifiedCitationOutput {
  id: string;
  quote: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  sectionTitle?: string;
  isVerified: boolean;
  matchedText: string | null;
  occurrencesCount: number;
  reason?: string;
}

export interface ResearchResponse {
  answer: string;
  citations: VerifiedCitationOutput[];
  steps: ResearchStep[];
  isGrounded: boolean;
}

export interface ResearchCallbacks {
  onStep?: (step: ResearchStep) => void;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

/**
 * System prompt instructing the model to act as an evidence-grounded legal assistant
 */
const SYSTEM_PROMPT = `You are ClauseLens, an expert legal contract analysis assistant.
You strictly answer questions grounded ONLY in the provided contract documents.
Every factual assertion or comparison MUST be backed by exact quotes from the documents.

RESEARCH GUIDELINES:
1. Use the provided tools (search_document, get_section, list_clauses) to find the relevant sections.
2. For multi-document questions, search across the relevant documents and compare the provisions comparatively.
3. If information is not found in the documents after thorough searching, state explicitly:
   "I could not find this in the selected document(s)."
4. Never invent, hallucinate, or extrapolate clauses.
5. In your final response, provide a clear answer followed by a JSON citation block formatted as:
\`\`\`json
{
  "citations": [
    {
      "quote": "exact verbatim text from the contract",
      "documentId": "id_of_the_document",
      "sectionTitle": "Section name"
    }
  ]
}
\`\`\`
Do not include commentary inside the JSON block.`;

/**
 * Executes agentic document research with up to 6 rounds of tool calls
 */
export async function runAgenticResearch(
  question: string,
  docs: ToolDocumentContext[],
  callbacks: ResearchCallbacks = {}
): Promise<ResearchResponse> {
  const steps: ResearchStep[] = [];
  const maxRounds = 6;
  let currentRound = 1;

  const apiKey = process.env.AI_API_KEY?.trim();
  const baseURL = process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const modelName = process.env.AI_MODEL?.trim() || "gpt-4o-mini";

  const verificationTargets: Map<string, DocumentVerificationTarget> = new Map(
    docs.map((d) => [
      d.id,
      {
        id: d.id,
        name: d.name,
        extractedText: d.extractedText,
        pages: d.pages,
      },
    ])
  );

  // If real AI provider is configured, run the multi-round tool loop with OpenAI-compatible API
  if (apiKey && apiKey.length > 5) {
    const openai = new OpenAI({
      apiKey,
      baseURL,
    });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Selected Documents:\n${docs.map((d) => `- [${d.id}] "${d.name}"`).join("\n")}\n\nQuestion: ${question}`,
      },
    ];

    while (currentRound <= maxRounds) {
      if (callbacks.signal?.aborted) {
        throw new Error("Research generation stopped by user.");
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[Agent] Starting Round ${currentRound}/${maxRounds}`);
      }

      const response = await openai.chat.completions.create(
        {
          model: modelName,
          messages,
          tools: CONTRACT_TOOLS as unknown as OpenAI.Chat.ChatCompletionTool[],
          tool_choice: "auto",
        },
        { signal: callbacks.signal }
      );

      const choice = response.choices[0];
      const message = choice.message;
      messages.push(message);

      // Check if tool calls were requested
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const stepId = `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const toolName = toolCall.function.name;
          const toolArgs = toolCall.function.arguments;

          const step: ResearchStep = {
            id: stepId,
            round: currentRound,
            tool: toolName,
            message: `Executing ${toolName}...`,
            input: toolArgs,
            status: "running",
            timestamp: Date.now(),
          };
          steps.push(step);
          callbacks.onStep?.(step);

          const result = executeTool(toolName, toolArgs, docs);

          step.message = result.activityMessage;
          step.output = result.output;
          step.status = result.success ? "completed" : "error";
          callbacks.onStep?.(step);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result.output,
          });
        }
        currentRound++;
      } else {
        // Model provided final text
        const finalText = message.content || "";
        return processFinalAnswer(finalText, verificationTargets, steps, callbacks);
      }
    }

    // If max rounds reached, ask for synthesis
    messages.push({
      role: "user",
      content: "Please synthesize your final answer and citations based strictly on the retrieved tool findings.",
    });

    const finalResponse = await openai.chat.completions.create(
      {
        model: modelName,
        messages,
      },
      { signal: callbacks.signal }
    );

    const finalText = finalResponse.choices[0]?.message?.content || "";
    return processFinalAnswer(finalText, verificationTargets, steps, callbacks);
  }

  // Autonomous deterministic multi-round tool engine when API key is not configured or in testing
  return await runDeterministicAgent(question, docs, verificationTargets, steps, callbacks);
}

/**
 * Deterministic multi-round agentic engine for offline, test, and unconfigured states.
 * Executes genuine multi-round tool calls and builds evidence-grounded answers.
 */
async function runDeterministicAgent(
  question: string,
  docs: ToolDocumentContext[],
  targets: Map<string, DocumentVerificationTarget>,
  steps: ResearchStep[],
  callbacks: ResearchCallbacks
): Promise<ResearchResponse> {
  let round = 1;

  // Round 1: Search relevant documents
  const step1Id = `step_round_1_${Date.now()}`;
  const step1: ResearchStep = {
    id: step1Id,
    round: round++,
    tool: "search_document",
    message: `Searching documents for "${question.slice(0, 40)}..."`,
    status: "running",
    timestamp: Date.now(),
  };
  steps.push(step1);
  callbacks.onStep?.(step1);

  const searchResult = executeTool("search_document", { query: question, documentIds: docs.map((d) => d.id) }, docs);
  step1.message = searchResult.activityMessage;
  step1.output = searchResult.output;
  step1.status = "completed";
  callbacks.onStep?.(step1);

  const rawResults = (searchResult.rawResult as Array<{
    documentId: string;
    sectionTitle: string;
    content: string;
    pageNumber: number;
    chunkId: string;
  }>) || [];

  // Round 2: Read section details if found
  if (rawResults.length > 0) {
    const topMatch = rawResults[0];
    const step2Id = `step_round_2_${Date.now()}`;
    const step2: ResearchStep = {
      id: step2Id,
      round: round++,
      tool: "get_section",
      message: `Reading "${topMatch.sectionTitle}" on Page ${topMatch.pageNumber}...`,
      status: "running",
      timestamp: Date.now(),
    };
    steps.push(step2);
    callbacks.onStep?.(step2);

    const sectionResult = executeTool(
      "get_section",
      { documentId: topMatch.documentId, sectionId: topMatch.sectionTitle },
      docs
    );
    step2.message = sectionResult.activityMessage;
    step2.output = sectionResult.output;
    step2.status = "completed";
    callbacks.onStep?.(step2);
  }

  // If question is multi-document comparison, round 3: compare across second doc
  if (docs.length > 1) {
    const step3Id = `step_round_3_${Date.now()}`;
    const step3: ResearchStep = {
      id: step3Id,
      round: round++,
      tool: "search_document",
      message: `Comparing clauses across ${docs.length} documents...`,
      status: "running",
      timestamp: Date.now(),
    };
    steps.push(step3);
    callbacks.onStep?.(step3);

    const doc2 = docs[1];
    const compResult = executeTool("search_document", { query: question, documentIds: [doc2.id] }, docs);
    step3.message = `Comparing clauses across 2 documents...`;
    step3.output = compResult.output;
    step3.status = "completed";
    callbacks.onStep?.(step3);
  }

  // Synthesize answer based on retrieved evidence
  if (rawResults.length === 0) {
    const notFoundText = "I could not find this in the selected document(s).";
    if (callbacks.onToken) {
      for (const char of notFoundText) {
        callbacks.onToken(char);
      }
    }
    return {
      answer: notFoundText,
      citations: [],
      steps,
      isGrounded: false,
    };
  }

  // Build grounded response with verified quotes from retrieved chunks
  const answerParagraphs: string[] = [];
  const candidateQuotes: Array<{ quote: string; documentId: string; sectionTitle: string }> = [];

  for (const r of rawResults.slice(0, 3)) {
    const docName = docs.find((d) => d.id === r.documentId)?.name || r.documentId;
    const sentences = r.content.split(/\.\s+/).filter((s) => s.trim().length > 20);
    const quoteSentence = sentences[0] || r.content.slice(0, 150);

    candidateQuotes.push({
      quote: quoteSentence.trim(),
      documentId: r.documentId,
      sectionTitle: r.sectionTitle,
    });

    answerParagraphs.push(
      `According to **${docName}** (${r.sectionTitle}, Page ${r.pageNumber}), the contract provides that: "${quoteSentence.trim()}."`
    );
  }

  let finalAnswer = answerParagraphs.join("\n\n");
  if (!process.env.AI_API_KEY) {
    finalAnswer += "\n\n*(Note: AI provider API key is not configured. This answer was assembled deterministically by the agentic research pipeline from retrieved contract evidence.)*";
  }

  // Stream answer token by token
  if (callbacks.onToken) {
    for (const chunk of finalAnswer.split(" ")) {
      callbacks.onToken(chunk + " ");
    }
  }

  // Verify all citations independently
  const verifiedCitations: VerifiedCitationOutput[] = [];
  let citationIndex = 1;

  for (const item of candidateQuotes) {
    const target = targets.get(item.documentId);
    if (!target) continue;

    const verification = verifyQuote(item.quote, target);
    verifiedCitations.push({
      id: `cit_${citationIndex++}`,
      quote: item.quote,
      documentId: item.documentId,
      documentName: target.name,
      pageNumber: verification.pageNumber,
      sectionTitle: item.sectionTitle,
      isVerified: verification.isVerified,
      matchedText: verification.matchedText,
      occurrencesCount: verification.occurrencesCount,
      reason: verification.reason,
    });
  }

  return {
    answer: finalAnswer,
    citations: verifiedCitations,
    steps,
    isGrounded: verifiedCitations.some((c) => c.isVerified),
  };
}

/**
 * Parses final model answer, extracts JSON citations, and validates each through the independent quote verification pipeline
 */
function processFinalAnswer(
  rawText: string,
  targets: Map<string, DocumentVerificationTarget>,
  steps: ResearchStep[],
  callbacks: ResearchCallbacks
): ResearchResponse {
  // Extract JSON citation block if present
  let cleanAnswer = rawText;
  let rawCitations: Array<{ quote: string; documentId: string; sectionTitle?: string }> = [];

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.citations && Array.isArray(parsed.citations)) {
        rawCitations = parsed.citations;
        cleanAnswer = rawText.replace(jsonMatch[0], "").trim();
      }
    } catch {
      // not a valid citations json block, keep raw text
    }
  }

  // Stream cleaned answer
  if (callbacks.onToken) {
    for (const word of cleanAnswer.split(" ")) {
      callbacks.onToken(word + " ");
    }
  }

  // Independent Quote Verification
  const verifiedCitations: VerifiedCitationOutput[] = [];
  let citCounter = 1;

  for (const c of rawCitations) {
    const target = targets.get(c.documentId);
    if (!target) {
      verifiedCitations.push({
        id: `cit_${citCounter++}`,
        quote: c.quote,
        documentId: c.documentId,
        documentName: "Unknown Document",
        pageNumber: null,
        sectionTitle: c.sectionTitle,
        isVerified: false,
        matchedText: null,
        occurrencesCount: 0,
        reason: "Document ID not found in selected context.",
      });
      continue;
    }

    const verification = verifyQuote(c.quote, target);
    verifiedCitations.push({
      id: `cit_${citCounter++}`,
      quote: c.quote,
      documentId: c.documentId,
      documentName: target.name,
      pageNumber: verification.pageNumber,
      sectionTitle: c.sectionTitle,
      isVerified: verification.isVerified,
      matchedText: verification.matchedText,
      occurrencesCount: verification.occurrencesCount,
      reason: verification.reason,
    });
  }

  const isGrounded =
    verifiedCitations.length === 0 || verifiedCitations.some((c) => c.isVerified);

  return {
    answer: cleanAnswer,
    citations: verifiedCitations,
    steps,
    isGrounded,
  };
}
