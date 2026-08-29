import { getModel } from "../config/llmModels.js"
import { generatePpt } from "../utils/generatePpt.js"
import { uploadToS3 } from "../utils/uploadToS3.js"
import { getFromS3 } from "../utils/getFromS3.js"
import { checkAgentLimit } from "../config/agentLimit.js"

/**
 * Agent 3 — Presentation + Infographic Generator
 *
 * Reuses ppt.agent.js pattern for presentation; adds infographic as a second
 * docType branch (schema-driven JSON output, no binary export).
 * Both grounded in evidenceContext with citations.
 */

const PRESENTATION_SCHEMA = {
  title: "",
  subtitle: "",
  slides: [
    {
      title: "",
      points: [],
      speakerNotes: "",
      dataVisualRecommendation: ""
    }
  ],
  citations: []
}

const INFOGRAPHIC_SCHEMA = {
  headline: "",
  keyMessages: [],
  statistics: [],
  contentHierarchy: [],
  layoutRecommendation: "",
  citations: []
}

export const presentationAgent = async (state, docType) => {
  try {
    await checkAgentLimit(state.userId, "presentation")
    const llm = await getModel("presentation")

    // ── Evidence guard: fail early if no evidence is available ──────────────
    if (!state.evidenceContext || state.evidenceContext.trim().length < 50) {
      console.error(`[Presentation] No evidence context available (${state.evidenceContext?.length || 0} chars). Cannot generate grounded presentation.`)
      return {
        status: "failed",
        error: "No source evidence available. Document ingestion may have failed — please re-upload your document."
      }
    }

    if (docType === "presentation") {
      const prompt = `You are a professional presentation designer for disaster/crisis communications.

AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Create a comprehensive presentation"}

EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext}
===

CRITICAL RULES:
- Base every factual claim ONLY on the evidence provided above.
- If information is not in the evidence, write "Not specified in source".
- Include "citations" array listing chunkIds used.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}
- Each slide MUST include "speakerNotes" and "dataVisualRecommendation" fields.

Return ONLY valid JSON matching this schema:
${JSON.stringify(PRESENTATION_SCHEMA, null, 2)}

Rules:
- Generate exactly 6 content slides.
- Each slide should have 4-6 concise bullet points.
- speakerNotes: talking points for the presenter (2-3 sentences).
- dataVisualRecommendation: suggest chart type or visual for this slide's data.
- No markdown. No explanation. No code block.
- Return ONLY JSON.

Topic:
${state.prompt || state.objective || "Generate presentation"}`

      const res = await llm.invoke(prompt)
      let data
      try {
        let raw = res.content.trim()
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
        }
        data = JSON.parse(raw)
      } catch (parseError) {
        console.log("Presentation agent JSON parse error:", parseError)
        return {
          status: "failed",
          error: "Failed to parse presentation — LLM returned invalid JSON."
        }
      }

      if (!data.citations) data.citations = []

      const ppt = await generatePpt(data)
      const buffer = await ppt.write({ outputType: "nodebuffer" })
      const filename = `ppt-${Date.now()}.pptx`

      const uploadKey = await uploadToS3(
        filename,
        buffer,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      )
      const downloadUrl = await getFromS3(uploadKey, 24 * 60 * 60)

      return {
        status: "done",
        aiResponse: `# ✅ Presentation Generated\n\n**${data.title}**\n\n📥 [Download PPT](${downloadUrl})\n\n_Link expires in 24 hours._`,
        artifacts: [{ type: "presentation", data, downloadUrl }],
        citations: data.citations
      }
    }

    if (docType === "infographic") {
      const prompt = `You are an expert infographic content designer for disaster/crisis communications.

AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Create an infographic layout"}

EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext}
===

CRITICAL RULES:
- Base every fact ONLY on the evidence provided above.
- If information is not in the evidence, write "Not specified in source".
- Include "citations" array listing chunkIds used.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}

Return ONLY valid JSON matching this schema:
${JSON.stringify(INFOGRAPHIC_SCHEMA, null, 2)}

Rules:
- headline: a compelling one-line headline.
- keyMessages: 3-5 critical takeaways.
- statistics: key numbers/percentages with labels.
- contentHierarchy: ordered list of content sections by visual priority.
- layoutRecommendation: describe ideal layout (e.g., "vertical flow with icon cards").
- No markdown. No explanation. Return ONLY JSON.

Topic:
${state.prompt || state.objective || "Generate infographic content"}`

      const res = await llm.invoke(prompt)
      let data
      try {
        let raw = res.content.trim()
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
        }
        data = JSON.parse(raw)
      } catch (parseError) {
        console.log("Infographic agent JSON parse error:", parseError)
        return {
          status: "failed",
          error: "Failed to parse infographic — LLM returned invalid JSON."
        }
      }

      if (!data.citations) data.citations = []

      return {
        status: "done",
        aiResponse: `# Infographic Content Generated\n\n**${data.headline}**\n\n**Key Messages:** ${data.keyMessages?.length || 0}\n**Statistics:** ${data.statistics?.length || 0}\n**Layout:** ${data.layoutRecommendation || "N/A"}`,
        artifacts: [{ type: "infographic", data }],
        citations: data.citations
      }
    }

    return {
      status: "failed",
      error: `Unknown presentation type: ${docType}`
    }

  } catch (error) {
    console.error(`Presentation agent (${docType}) error:`, error)
    return {
      status: "failed",
      error: error?.message || error?.data?.message || `Failed to generate ${docType}`
    }
  }
}
