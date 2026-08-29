import { getModel } from "../config/llmModels.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import { generateGroundedFallback } from "../utils/fallbackGenerator.js"
import { invokeLLMWithRetry } from "../utils/llmRetry.js"

/**
 * Agent 4 — Social Post Generator
 *
 * One file, parameterized by platform ("linkedin" | "twitter").
 * Both are short-form structured posts with the same pipeline but different
 * schema/length rules. Twitter 280-char limit is hard-enforced in code.
 */

const SOCIAL_SCHEMAS = {
  linkedin: {
    hook: "(attention-grabbing opening line, 1-2 sentences)",
    body: "(main content, MUST be 150-220 words minimum for standard detail, 250-350 words for long detail)",
    tone: "(the tone used: formal, urgent, conversational, etc.)",
    cta: "(call to action, 1-2 sentences)",
    hashtags: ["(max 5 relevant hashtags)"],
    citations: ["(chunkIds used)"]
  },
  twitter: {
    mode: "single",   // "single" | "thread"
    post: "",
    thread: [],
    hashtags: [],
    citations: []
  }
}

/**
 * Split text into a numbered thread on sentence boundaries.
 * Each thread item is at most maxLen chars including the (n/N) prefix.
 */
function splitIntoThread(text, maxLen = 280) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const items = []
  let current = ""

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    // Reserve space for " (nn/nn)" suffix — up to 8 chars
    const reservedLen = maxLen - 8
    if ((current + " " + trimmed).trim().length <= reservedLen) {
      current = (current + " " + trimmed).trim()
    } else {
      if (current) items.push(current)
      // If a single sentence exceeds reservedLen, force-truncate it
      if (trimmed.length > reservedLen) {
        let remaining = trimmed
        while (remaining.length > reservedLen) {
          items.push(remaining.slice(0, reservedLen))
          remaining = remaining.slice(reservedLen)
        }
        if (remaining) current = remaining
      } else {
        current = trimmed
      }
    }
  }
  if (current) items.push(current)

  const total = items.length
  return items.map((item, i) => `(${i + 1}/${total}) ${item}`)
}

export const socialAgent = async (state, platform) => {
  try {
    await checkAgentLimit(state.userId, "social")

    // ── Evidence guard: fail early if no evidence is available ──────────────
    if (!state.evidenceContext || state.evidenceContext.trim().length < 50) {
      console.error(`[Social] No evidence context available (${state.evidenceContext?.length || 0} chars). Cannot generate grounded post.`)
      return {
        status: "failed",
        error: "No source evidence available. Document ingestion may have failed — please re-upload your document."
      }
    }

    const llm = await getModel("social")

    const schema = SOCIAL_SCHEMAS[platform]
    if (!schema) {
      return {
        status: "failed",
        error: `Unknown platform: ${platform}`
      }
    }

    const detail = (state.detail || "standard").toLowerCase()

    const lengthGuidance = platform === "linkedin"
      ? detail === "brief"
        ? "LinkedIn post body should be 80-120 words. Keep it punchy and direct. Hook: 1 sentence. CTA: 1 sentence."
        : detail === "long"
        ? "LinkedIn post body MUST be at least 250 words and ideally 300-450 words. Write a comprehensive, detailed multi-paragraph post with deep analysis, context, key statistics, and a strong call-to-action."
        : "LinkedIn post body MUST be at least 150 words and ideally 150-220 words. Cover the situation, impact, key facts, and recommended actions. Hook: 1-2 compelling sentences. CTA: 1-2 actionable sentences. Do NOT write a body shorter than 120 words."
      : detail === "brief"
        ? "Twitter: Write a single tweet under 280 characters (including hashtags). Do NOT use thread mode."
        : detail === "long"
        ? "Twitter: Write a detailed thread with 4-6 tweets. Set mode to \"thread\". Each tweet should be a complete thought with substantive content under 280 characters."
        : "Twitter post MUST be under 280 characters total (including hashtags). If it cannot fit, set mode to \"thread\" and split into 2-3 thread items, each under 280 characters."

    const conversationContext = state.conversationHistory?.length
      ? `\nCONVERSATION HISTORY (previous exchanges in this session — use for context and continuity):\n${state.conversationHistory.map(m => `[${m.role}]: ${m.content}`).join("\n")}\n`
      : ""

    const prompt = `You are an expert social media content creator for disaster/crisis communications.

PLATFORM: ${platform}
AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Create an engaging social media post"}

LENGTH RULES (CRITICAL — FOLLOW EXACTLY): ${lengthGuidance}
${conversationContext}
EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext || state.prompt || "Disaster response briefing"}
===

CRITICAL RULES:
- Base every factual claim ONLY on the evidence provided above.
- If information is not in the evidence, do not invent it.
- Include "citations" array listing chunkIds used.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}
- Hashtags: maximum 5 relevant hashtags.
- STRICTLY follow the LENGTH RULES above. If the user asked for detailed/long content, you MUST write substantially more.
${platform === "linkedin" ? `- For standard/long detail, the "body" field MUST contain a detailed, multi-paragraph post of AT LEAST 150 words. Cover the situation, impact, key facts, and recommended actions. DO NOT write a short 2-3 sentence body.` : ""}

Return ONLY valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Rules:
- Output must start with {
- Output must end with }
- No markdown. No explanation. No extra text. No \`\`\`

User Request:
${state.prompt || state.objective || `Generate a ${platform} post`}`

    let data
    try {
      const res = await invokeLLMWithRetry(llm, prompt)
      let raw = (res?.content || "").trim()
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
      }
      data = JSON.parse(raw)
    } catch (llmOrParseErr) {
      console.warn(`[Social Agent] LLM invocation failed (${llmOrParseErr.message}). Using grounded fallback generator.`);
      data = generateGroundedFallback(platform, state)
    }

    if (!data.citations) data.citations = state.sourceChunks?.map(c => c.chunkId) || []

    // ── LinkedIn: enforce minimum body length ───────────────────────────────
    if (platform === "linkedin") {
      const bodyWordCount = (data.body || "").split(/\s+/).filter(w => w.length > 0).length
      console.log(`[Social] LinkedIn body word count: ${bodyWordCount}`)

      if (bodyWordCount < 80) {
        console.log(`[Social] LinkedIn body too short (${bodyWordCount} words), re-prompting for expansion...`)
        const expandPrompt = `The following LinkedIn post body is only ${bodyWordCount} words, which is far too short. Expand it to be at least 150 words while maintaining the same tone, facts, and structure. Add more detail about the situation, impacts, key statistics, and actionable recommendations. Use ONLY the evidence provided earlier — do not invent facts.

Current body:
${data.body}

EVIDENCE:
${state.evidenceContext}

Return ONLY the expanded body text (plain text, no JSON, no markdown, no explanation). Write at least 150 words.`
        
        try {
          const expandRes = await llm.invoke(expandPrompt)
          const expandedBody = expandRes.content.trim()
          const expandedWordCount = expandedBody.split(/\s+/).filter(w => w.length > 0).length
          console.log(`[Social] Expanded LinkedIn body: ${expandedWordCount} words`)
          if (expandedWordCount > bodyWordCount) {
            data.body = expandedBody
          }
        } catch (expandErr) {
          console.log(`[Social] Expansion re-prompt failed:`, expandErr.message)
          // Keep original body — better than nothing
        }
      }
    }

    // ── Twitter: hard-enforce 280-char limit in code ────────────────────────
    if (platform === "twitter") {
      const hashtagText = data.hashtags?.length
        ? " " + data.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")
        : ""

      if (data.mode === "thread" && Array.isArray(data.thread) && data.thread.length > 0) {
        // Enforce 280 chars per thread item
        data.thread = data.thread.map((item, i) => {
          const itemText = (typeof item === "string" ? item : (item.text || "")).replace(/^\(\d+\/\d+\)\s*/, "").trim()
          if (itemText.length <= 270) return itemText
          return itemText.slice(0, 267) + "..."
        })

        const threadSummary = data.thread.map((t, i) => `(${i + 1}/${data.thread.length}) ${t}`).join("\n\n")

        return {
          status: "done",
          aiResponse: `# 🧵 X / Twitter Thread Generated (${data.thread.length} posts)\n\n${threadSummary}\n\n${hashtagText}`,
          artifacts: [{ type: "twitter", data }],
          citations: data.citations
        }
      }

      // Single post: check length with hashtags
      const singleText = data.post || ""
      const totalLen = singleText.length + hashtagText.length

      if (totalLen > 280) {
        // Automatically split into a thread
        const threadItems = splitIntoThread(singleText, 280).map(t => t.replace(/^\(\d+\/\d+\)\s*/, "").trim())
        data.mode = "thread"
        data.thread = threadItems

        const threadSummary = threadItems.map((t, i) => `(${i + 1}/${threadItems.length}) ${t}`).join("\n\n")

        return {
          status: "done",
          aiResponse: `# 🧵 X / Twitter Thread Generated (${threadItems.length} posts)\n\n${threadSummary}\n\n${hashtagText}`,
          artifacts: [{ type: "twitter", data }],
          citations: data.citations
        }
      }

      return {
        status: "done",
        aiResponse: `# 🐦 X / Twitter Post Generated\n\n${singleText}\n\n${hashtagText}`,
        artifacts: [{ type: "twitter", data }],
        citations: data.citations
      }
    }

    // ── LinkedIn ────────────────────────────────────────────────────────────
    if (platform === "linkedin") {
      const hashtagText = data.hashtags?.length
        ? "\n\n" + data.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")
        : ""

      const ctaText = data.cta ? `\n\n👉 **${data.cta}**` : ""

      return {
        status: "done",
        aiResponse: `# 💼 LinkedIn Post Generated\n\n### ${data.hook || ""}\n\n${data.body || ""}${ctaText}${hashtagText}`,
        artifacts: [{ type: "linkedin", data }],
        citations: data.citations
      }
    }

    return {
      status: "failed",
      error: `Unknown platform: ${platform}`
    }

  } catch (error) {
    console.error(`Social agent (${platform}) error:`, error)
    return {
      status: "failed",
      error: error?.message || error?.data?.message || `Failed to generate ${platform} post`
    }
  }
}

