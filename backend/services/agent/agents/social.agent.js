import { getModel } from "../config/llmModels.js"
import { checkAgentLimit } from "../config/agentLimit.js"

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

    const linkedinWordTarget = state.detail === "long" ? "250-350" : "150-220"
    const lengthGuidance = platform === "linkedin"
      ? `LinkedIn post body MUST be at least ${state.detail === "long" ? "250" : "150"} words and ideally ${linkedinWordTarget} words. The hook should be 1-2 compelling sentences. The CTA should be 1-2 actionable sentences. Do NOT write a body shorter than 120 words — this is a HARD MINIMUM. Write a substantial, detailed post that thoroughly covers the crisis situation.`
      : `Twitter post MUST be under 280 characters total (including hashtags). If it cannot fit, set mode to "thread" and split into thread items, each under 280 characters. Make the post impactful and informative within the character limit.`

    const prompt = `You are an expert social media content creator for disaster/crisis communications.

PLATFORM: ${platform}
AUDIENCE: ${state.audience || "general public"}
TONE: ${state.tone || "formal"}
LANGUAGE: ${state.language || "English"}
DETAIL LEVEL: ${state.detail || "standard"}
OBJECTIVE: ${state.objective || "Create an engaging social media post"}

LENGTH RULES (CRITICAL — FOLLOW EXACTLY): ${lengthGuidance}

EVIDENCE (use ONLY this as your source of truth):
===
${state.evidenceContext}
===

CRITICAL RULES:
- Base every factual claim ONLY on the evidence provided above.
- If information is not in the evidence, do not invent it.
- Include "citations" array listing chunkIds used.
- Available chunkIds: ${state.sourceChunks?.map(c => c.chunkId).join(", ") || "none"}
- Hashtags: maximum 5 relevant hashtags.
${platform === "linkedin" ? `- The "body" field MUST contain a detailed, multi-paragraph post of AT LEAST 150 words. Cover the situation, impact, key facts, and recommended actions. DO NOT write a short 2-3 sentence body.` : ""}

Return ONLY valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

Rules:
- Output must start with {
- Output must end with }
- No markdown. No explanation. No extra text. No \`\`\`

User Request:
${state.prompt || state.objective || `Generate a ${platform} post`}`

    const res = await llm.invoke(prompt)
    let data
    try {
      let raw = res.content.trim()
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "")
      }
      data = JSON.parse(raw)
    } catch (parseError) {
      console.log(`Social agent (${platform}) JSON parse error:`, parseError)
      return {
        status: "failed",
        error: `Failed to parse ${platform} post — LLM returned invalid JSON.`
      }
    }

    if (!data.citations) data.citations = []

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

      if (data.mode === "single" || !data.mode) {
        const fullPost = (data.post || "") + hashtagText

        if (fullPost.length > 280) {
          // One re-prompt attempt to shorten
          const retryPrompt = `The following Twitter post is ${fullPost.length} characters, which exceeds the 280-character limit. Rewrite it to be UNDER 280 characters total, including hashtags. Return ONLY the shortened text, no JSON, no explanation:\n\n${fullPost}`
          const retryRes = await llm.invoke(retryPrompt)
          const shortened = retryRes.content.trim()

          if (shortened.length <= 280) {
            data.post = shortened
            data.hashtags = [] // hashtags included in the shortened text
            data.mode = "single"
          } else {
            // Deterministic fallback: split into numbered thread
            const threadItems = splitIntoThread(
              (data.post || "") + hashtagText
            )
            data.mode = "thread"
            data.thread = threadItems
            data.post = ""
          }
        }
      }

      // Validate thread items too
      if (data.mode === "thread" && data.thread?.length > 0) {
        data.thread = data.thread.flatMap(item => {
          if (item.length > 280) {
            return splitIntoThread(item)
          }
          return [item]
        })
      }
    }

    // ── Build response ──────────────────────────────────────────────────────
    let preview = ""
    if (platform === "linkedin") {
      preview = `**Hook:** ${data.hook || "N/A"}\n\n${data.body || ""}\n\n**CTA:** ${data.cta || "N/A"}\n\n${data.hashtags?.map(h => h.startsWith("#") ? h : `#${h}`).join(" ") || ""}`
    } else {
      if (data.mode === "thread") {
        preview = `**Thread (${data.thread?.length || 0} posts):**\n\n${data.thread?.map(t => `> ${t}`).join("\n\n") || ""}`
      } else {
        preview = data.post || ""
        if (data.hashtags?.length) {
          preview += "\n\n" + data.hashtags.map(h => h.startsWith("#") ? h : `#${h}`).join(" ")
        }
      }
    }

    return {
      status: "done",
      aiResponse: `# ${platform === "linkedin" ? "LinkedIn" : "X/Twitter"} Post Generated\n\n${preview}`,
      artifacts: [{ type: platform, data }],
      citations: data.citations
    }

  } catch (error) {
    console.error(`Social agent (${platform}) error:`, error)
    return {
      status: "failed",
      error: error?.message || error?.data?.message || `Failed to generate ${platform} post`
    }
  }
}

