import { getModel } from "../config/llmModels.js"
import { generatePdf } from "../utils/generatePdf.js"
import { uploadToS3 } from "../utils/uploadToS3.js"
import { getFromS3 } from "../utils/getFromS3.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { generateGroundedFallback } from "../utils/fallbackGenerator.js"
import { invokeLLMWithRetry } from "../utils/llmRetry.js"

/**
 * Agent 2 — Structured Document Generator
 *
 * Replaces pdf.agent.js, parameterized by docType.
 * Handles: advisory, executiveSummary, videoScript.
 * Follows the generator pattern: checkAgentLimit → getModel → JSON-schema prompt
 * → JSON.parse → build artefact → (if binary) upload to S3 → return results.
 */

const SCHEMAS = {
  advisory: {
    title: "",
    date: "",
    situation: "",
    affectedAudience: "",
    riskImpact: "",
    recommendedAction: "",
    contactDetails: "",
    citations: []
  },
  executiveSummary: {
    context: "",
    keyFacts: [],
    implications: [],
    risks: [],
    recommendations: [],
    decisionRequired: "",
    citations: []
  },
  videoScript: {
    objective: "",
    targetDuration: "",
    scenes: [
      { sceneNumber: 0, visualDirection: "", narration: "", subtitle: "" }
    ],
    citations: []
  }
}

/**
 * Returns explicit length/depth guidance for each detail level and document type.
 */
function getDetailGuidance(detail, docType) {
  const guides = {
    advisory: {
      brief: "Write a concise advisory. Each field (situation, riskImpact, recommendedAction) should be 1-2 sentences, totaling 100-150 words overall.",
      standard: "Write a balanced advisory. Each field should be 2-4 sentences with specific details, totaling 200-350 words overall.",
      long: "Write an in-depth, comprehensive advisory. Each field should be a full paragraph (4-8 sentences) with thorough analysis, totaling 400-700 words overall. Include detailed risk assessments and step-by-step recommended actions."
    },
    executiveSummary: {
      brief: "Write a brief executive summary. Include 3-4 keyFacts, 2-3 implications, 2 risks, and 2 recommendations. Keep each item to 1 sentence.",
      standard: "Write a balanced executive summary. Include 5-7 keyFacts, 3-5 implications, 3-4 risks, and 3-5 recommendations. Each item should be 1-2 sentences.",
      long: "Write a comprehensive, in-depth executive summary. Include 8-12 keyFacts, 5-7 implications, 5-6 risks, and 5-8 recommendations. Each item should be 2-3 sentences with supporting details and data points. The context field should be a full paragraph."
    },
    videoScript: {
      brief: "Generate 3 scenes. Each scene narration should be 2-3 sentences.",
      standard: "Generate 5-6 scenes. Each scene narration should be 3-5 sentences with clear visual directions.",
      long: "Generate 7-10 scenes. Each scene narration should be 4-7 sentences with detailed visual directions, transitions, and comprehensive subtitle text. Include B-roll suggestions in visualDirection."
    }
  }
  const level = (detail || "standard").toLowerCase()
  return guides[docType]?.[level] || guides[docType]?.standard || ""
}

export const documentAgent = async (state, docType) => {
  try {
    await checkAgentLimit(state.userId, "document")
    const llm = await getModel("document")

    // Normalize docType to match SCHEMAS keys
    const normalizedKey = (docType === "executivesummary" || docType === "executiveSummary")
      ? "executiveSummary"
      : (docType === "videoscript" || docType === "videoScript")
      ? "videoScript"
      : docType

    const schema = SCHEMAS[normalizedKey]
    if (!schema) {
      return {
        status: "failed",
        error: `Unknown document type: ${docType}`
      }
    }

    const detailGuidance = getDetailGuidance(state.detail, normalizedKey)
    const conversationContext = state.conversationHistory?.length
      ? `\nCONVERSATION HISTORY (previous exchanges in this session — use for context and continuity):\n${state.conversationHistory.map(m => `[${m.role}]: ${m.content}`).join("\n")}\n`
      : ""

    const prompt = `You are an expert document generator for disaster/crisis communications.

DOCUMENT TYPE: ${normalizedKey}

AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Generate a comprehensive document"}

LENGTH/DEPTH RULES: ${detailGuidance}
${conversationContext}
EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext || state.prompt || "Disaster situation context provided by operator"}
===

CRITICAL RULES:
- Base every factual claim ONLY on the evidence provided above.
- If information needed for a field is not in the evidence, write "Not specified in source" rather than inventing it.
- Include a "citations" array listing the chunkIds from the source that support your content.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}
- STRICTLY follow the LENGTH/DEPTH RULES above. If the user asked for detailed/long content, you MUST write substantially more.

Return ONLY valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Rules:
- Output must start with {
- Output must end with }
- No markdown
- No explanation
- No extra text
- No \`\`\`

User Request:
${state.prompt || state.objective || `Generate a ${normalizedKey}`}`

    let data
    try {
      const res = await invokeLLMWithRetry(llm, prompt)
      let raw = (res?.content || "").trim()
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
      }
      data = JSON.parse(raw)
    } catch (llmOrParseErr) {
      console.warn(`[Document Agent] LLM invocation failed (${llmOrParseErr.message}). Using grounded fallback generator.`);
      data = generateGroundedFallback(normalizedKey, state)
    }

    // Ensure citations array exists
    if (!data.citations) {
      data.citations = state.sourceChunks?.map(c => c.chunkId) || []
    }

    // For advisory and executiveSummary, render as PDF and upload to S3
    if (normalizedKey === "advisory" || normalizedKey === "executiveSummary") {
      const pdfBuffer = await generatePdf(data, normalizedKey)
      const filename = `${normalizedKey}-${Date.now()}.pdf`
      const uploadKey = await uploadToS3(filename, pdfBuffer, "application/pdf")
      const downloadUrl = await getFromS3(uploadKey, 24 * 60)

      return {
        status: "done",
        aiResponse: `# ${normalizedKey === "advisory" ? "Advisory" : "Executive Summary"} Generated\n\n📥 [Download PDF](${downloadUrl})\n\n_Link expires in 24 hours._`,
        artifacts: [{ type: normalizedKey, data, downloadUrl }],
        citations: data.citations
      }
    }

    // For videoScript, return structured JSON directly (no binary export)
    return {
      status: "done",
      aiResponse: `# Video Script Generated\n\n**Objective:** ${data.objective || "N/A"}\n**Target Duration:** ${data.targetDuration || "N/A"}\n**Scenes:** ${data.scenes?.length || 0}`,
      artifacts: [{ type: normalizedKey, data }],
      citations: data.citations
    }

  } catch (error) {
    console.error(`Document agent (${docType}) error:`, error)
    return {
      status: "failed",
      error: error?.message || error?.data?.message || `Failed to generate ${docType}`
    }
  }
}
