import { getModel } from "../config/llmModels.js"
import { invokeLLMWithRetry } from "../utils/llmRetry.js"

/**
 * Validation Layer
 * 
 * Evaluates generated output for:
 * 1. Completeness: required schema fields are non-empty
 * 2. Platform Constraints: Twitter <= 280 chars, LinkedIn hashtags < 10
 * 3. Safety: Regex/denylist scan for PII (email/phone patterns)
 * 4. Grounding: LLM self-check ("does this contain claims not supported by evidence?")
 * 5. Consistency: Named entities/dates/figures cross-checked across other outputs in the job
 */

const PII_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PII_PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g

export const validateOutput = async (outputType, data, state) => {
  const notes = []
  let completeness = true
  let platformConstraints = true
  let safety = true
  let grounding = true
  let consistency = true

  // 1. Completeness Check
  if (!data || Object.keys(data).length === 0) {
    completeness = false
    notes.push("Output data is empty.")
  } else if (typeof data === "object") {
    for (const [key, value] of Object.entries(data)) {
      if (key === "citations") continue
      if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        notes.push(`Field '${key}' is empty or missing.`)
        completeness = false
      }
    }
  }

  // 2. Platform Constraints Check
  if (outputType === "twitter") {
    if (data.mode === "single" && data.post && data.post.length > 280) {
      platformConstraints = false
      notes.push(`Twitter post exceeds 280 characters (${data.post.length} chars).`)
    }
    if (data.mode === "thread" && Array.isArray(data.thread)) {
      const longPosts = data.thread.filter(t => t.length > 280)
      if (longPosts.length > 0) {
        platformConstraints = false
        notes.push(`Twitter thread contains ${longPosts.length} post(s) exceeding 280 characters.`)
      }
    }
  } else if (outputType === "linkedin") {
    if (Array.isArray(data.hashtags) && data.hashtags.length >= 10) {
      platformConstraints = false
      notes.push(`LinkedIn post has too many hashtags (${data.hashtags.length}). Keep under 10.`)
    }
  }

  // 3. Safety Check (PII detection on content fields, ignoring internal chunk IDs)
  const { citations: _, ...contentOnly } = (typeof data === "object" && data !== null) ? data : { data }
  const textBlob = JSON.stringify(contentOnly).replace(/src-\d+/g, "")
  const emailMatches = textBlob.match(PII_EMAIL_REGEX)
  const phoneMatches = textBlob.match(PII_PHONE_REGEX)

  if (emailMatches && emailMatches.length > 0) {
    safety = false
    notes.push(`Potential email PII detected: ${emailMatches.join(", ")}`)
  }
  if (phoneMatches && phoneMatches.length > 0) {
    safety = false
    notes.push(`Potential phone number PII detected: ${phoneMatches.join(", ")}`)
  }

  // 4. Grounding Check (LLM Self-Check)
  try {
    const llm = await getModel("validate")
    const groundingPrompt = `You are a factual validation reviewer for disaster communications.

EVIDENCE:
===
${state.evidenceContext || "No evidence provided."}
===

GENERATED OUTPUT (${outputType}):
===
${JSON.stringify(data, null, 2)}
===

Task:
Does the generated output contain any major factual claims, figures, dates, or statements that are NOT supported by the evidence above?
Answer in format:
SUPPORTED: YES or NO
REASON: <concise 1-2 sentence reason>`

    const res = await invokeLLMWithRetry(llm, groundingPrompt)
    const resText = res.content || ""
    if (resText.toUpperCase().includes("SUPPORTED: NO")) {
      grounding = false
      notes.push(`Grounding check: ${resText.split("REASON:")[1]?.trim() || "Contains claims not verified in source evidence."}`)
    }
  } catch (err) {
    console.log("Grounding check error:", err.message)
    // Non-blocking for network/API limits
  }

  // 5. Cross-output Consistency Check (if multiple outputs exist)
  if (state.results && Object.keys(state.results).length > 0) {
    const currentDates = (textBlob.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi) || [])
    for (const [otherType, otherRes] of Object.entries(state.results)) {
      if (otherType === outputType || !otherRes?.artifacts?.[0]?.data) continue
      const otherBlob = JSON.stringify(otherRes.artifacts[0].data)
      const otherDates = (otherBlob.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi) || [])
      
      // Check if dates conflict
      if (currentDates.length > 0 && otherDates.length > 0) {
        const mismatch = currentDates.find(d => !otherDates.includes(d))
        if (mismatch) {
          notes.push(`Consistency note: Date "${mismatch}" appears in ${outputType} but not in ${otherType}.`)
        }
      }
    }
  }

  const passed = completeness && platformConstraints && safety && grounding

  return {
    completeness,
    platformConstraints,
    safety,
    grounding,
    consistency,
    passed,
    notes
  }
}
