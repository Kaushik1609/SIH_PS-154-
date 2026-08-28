import { getModel } from "../config/llmModels.js"
import { generatePpt } from "../utils/generatePpt.js"
import { uploadToS3 } from "../utils/uploadToS3.js"
import { getFromS3 } from "../utils/getFromS3.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { generateGroundedFallback } from "../utils/fallbackGenerator.js"
import { invokeLLMWithRetry } from "../utils/llmRetry.js"

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

    const detail = (state.detail || "standard").toLowerCase()
    const conversationContext = state.conversationHistory?.length
      ? `\nCONVERSATION HISTORY (previous exchanges in this session — use for context and continuity):\n${state.conversationHistory.map(m => `[${m.role}]: ${m.content}`).join("\n")}\n`
      : ""

    if (docType === "presentation") {
      const slideGuidance = detail === "brief"
        ? "Generate exactly 3-4 slides. Each slide should have 3 concise bullet points. Speaker notes should be 1-2 sentences."
        : detail === "long"
        ? "Generate 7-10 detailed slides. Each slide should have 5-7 comprehensive bullet points. Speaker notes should be 4-6 sentences with detailed talking points, transitions, and supporting data. Include detailed data visualization recommendations."
        : "Generate exactly 5-6 content slides. Each slide should have 4-5 concise bullet points. Speaker notes should be 2-3 sentences."

      const prompt = `You are a professional presentation designer for disaster/crisis communications.

AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Create a comprehensive presentation"}

SLIDE GENERATION RULES: ${slideGuidance}
${conversationContext}
EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext || state.prompt || "Disaster response briefing"}
===

CRITICAL RULES:
- Base every factual claim ONLY on the evidence provided above.
- If information is not in the evidence, write "Not specified in source".
- Include "citations" array listing chunkIds used.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}
- Each slide MUST include "speakerNotes" and "dataVisualRecommendation" fields.
- STRICTLY follow the SLIDE GENERATION RULES above.

Return ONLY valid JSON matching this schema:
${JSON.stringify(PRESENTATION_SCHEMA, null, 2)}

Rules:
- speakerNotes: talking points for the presenter.
- dataVisualRecommendation: suggest chart type or visual for this slide's data.
- No markdown. No explanation. No code block.
- Return ONLY JSON.

Topic:
${state.prompt || state.objective || "Generate presentation"}`

      let data
      try {
        const res = await invokeLLMWithRetry(llm, prompt)
        let raw = (res?.content || "").trim()
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
        }
        data = JSON.parse(raw)
      } catch (llmOrParseErr) {
        console.warn(`[Presentation Agent] LLM invocation failed (${llmOrParseErr.message}). Using grounded fallback generator.`);
        data = generateGroundedFallback("presentation", state)
      }

      if (!data.citations) data.citations = state.sourceChunks?.map(c => c.chunkId) || []

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
      const infoGuidance = detail === "brief"
        ? "Include 3 keyMessages, 2-3 statistics, and 3 contentHierarchy items. Keep each item to 1 sentence."
        : detail === "long"
        ? "Include 6-8 keyMessages, 5-8 statistics with detailed labels and context, and 6-8 contentHierarchy items. Each item should be 1-2 sentences. Provide a comprehensive layoutRecommendation with specific design suggestions."
        : "Include 4-5 keyMessages, 3-5 statistics, and 4-5 contentHierarchy items."

      const prompt = `You are an expert infographic content designer for disaster/crisis communications.

AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Create an infographic layout"}

CONTENT DEPTH RULES: ${infoGuidance}
${conversationContext}
EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext || state.prompt || "Disaster response briefing"}
===

CRITICAL RULES:
- Base every fact ONLY on the evidence provided above.
- If information is not in the evidence, write "Not specified in source".
- Include "citations" array listing chunkIds used.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}
- STRICTLY follow the CONTENT DEPTH RULES above.

Return ONLY valid JSON matching this schema:
${JSON.stringify(INFOGRAPHIC_SCHEMA, null, 2)}

Rules:
- headline: a compelling one-line headline.
- keyMessages: critical takeaways.
- statistics: key numbers/percentages with labels.
- contentHierarchy: ordered list of content sections by visual priority.
- layoutRecommendation: describe ideal layout (e.g., "vertical flow with icon cards").
- No markdown. No explanation. Return ONLY JSON.

Topic:
${state.prompt || state.objective || "Generate infographic content"}`

      let data
      try {
        const res = await invokeLLMWithRetry(llm, prompt)
        let raw = (res?.content || "").trim()
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
        }
        data = JSON.parse(raw)
      } catch (llmOrParseErr) {
        console.warn(`[Infographic Agent] LLM invocation failed (${llmOrParseErr.message}). Using grounded fallback generator.`);
        data = generateGroundedFallback("infographic", state)
      }

      if (!data.citations) data.citations = state.sourceChunks?.map(c => c.chunkId) || []

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
