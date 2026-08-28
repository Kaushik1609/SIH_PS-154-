/**
 * Invoke an LLM with retry on 429 rate limit errors.
 * Uses exponential backoff starting at 3s.
 */
export async function invokeLLMWithRetry(llm, prompt, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await llm.invoke(prompt)
        } catch (err) {
            const errMsg = err?.message || ""
            const is429 = errMsg.includes("429") || errMsg.includes("rate_limit") || errMsg.includes("Rate limit")
            if (is429 && attempt < maxRetries - 1) {
                // Parse retry-after hint from error message if available
                const retryMatch = errMsg.match(/try again in (\d+\.?\d*)s/i)
                const retryAfterSec = retryMatch ? parseFloat(retryMatch[1]) : null
                const waitMs = retryAfterSec
                    ? Math.ceil(retryAfterSec * 1000) + 500
                    : Math.min(3000 * Math.pow(2, attempt), 15000)
                console.log(`[LLM Retry] Rate limited (attempt ${attempt + 1}/${maxRetries}). Waiting ${waitMs}ms...`)
                await new Promise(r => setTimeout(r, waitMs))
                continue
            }
            throw err
        }
    }
}
