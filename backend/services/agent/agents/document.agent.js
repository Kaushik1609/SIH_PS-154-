import { getModel } from "../config/llmModels.js"
import { generatePdf } from "../utils/generatePdf.js"
import { uploadToS3 } from "../utils/uploadToS3.js"
import { getFromS3 } from "../utils/getFromS3.js"
import { checkAgentLimit } from "../config/agentLimit.js"

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

    const prompt = `You are an expert document generator for disaster/crisis communications.

DOCUMENT TYPE: ${normalizedKey}

AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Generate a comprehensive document"}

EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext || state.prompt || "Disaster situation context provided by operator"}
===

CRITICAL RULES:
- Base every factual claim ONLY on the evidence provided above.
- If information needed for a field is not in the evidence, write "Not specified in source" rather than inventing it.
- Include a "citations" array listing the chunkIds from the source that support your content.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}

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

    const res = await llm.invoke(prompt)
    let data
    try {
      // Strip any markdown code fences the LLM might add
      let raw = res.content.trim()
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
      }
      data = JSON.parse(raw)
    } catch (parseError) {
      console.log("Document agent JSON parse error:", parseError)
      return {
        status: "failed",
        error: "Failed to parse generated document — LLM returned invalid JSON."
      }
    }

    // Ensure citations array exists
    if (!data.citations) {
      data.citations = []
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
