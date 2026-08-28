import { graph } from "../graph/graph.js"
import Job from "../models/job.model.js"

/**
 * Fetch recent conversation messages from the chat service for context.
 * Returns an array of { role, content } objects (last 10 messages).
 */
async function fetchConversationHistory(conversationId) {
    if (!conversationId || conversationId.startsWith("incident-")) return []
    try {
        const chatServiceUrl = process.env.CHAT_SERVICE || "http://localhost:8002"
        const res = await fetch(`${chatServiceUrl}/get-messages/${conversationId}`)
        if (!res.ok) return []
        const messages = await res.json()
        if (!Array.isArray(messages)) return []
        // Take the last 10 messages for context window
        return messages.slice(-10).map(m => ({
            role: m.role || "user",
            content: (m.content || "").slice(0, 500) // truncate long messages to save tokens
        }))
    } catch (err) {
        console.log("Conversation history fetch (non-fatal):", err.message)
        return []
    }
}

/**
 * Invoke graph with retry on 429 rate limit errors.
 */
async function invokeWithRetry(stateInput, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await graph.invoke(stateInput)
        } catch (err) {
            const is429 = err?.message?.includes("429") || err?.message?.includes("rate_limit")
            if (is429 && attempt < maxRetries - 1) {
                const waitMs = Math.min(3000 * Math.pow(2, attempt), 15000)
                console.log(`[Agent] Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${waitMs}ms...`)
                await new Promise(r => setTimeout(r, waitMs))
                continue
            }
            throw err
        }
    }
}

export const agent = async (req, res, next) => {
    try {
        let {
            prompt,
            conversationId,
            outputTypes,
            audience,
            tone,
            language,
            detail,
            objective
        } = req.body

        const file = req.file
        const userId = req.headers["x-user-id"] || "anonymous"

        // Parse outputTypes if sent as a JSON string via FormData
        if (typeof outputTypes === "string") {
            try {
                outputTypes = JSON.parse(outputTypes)
            } catch (e) {
                outputTypes = outputTypes.split(",").map(s => s.trim()).filter(Boolean)
            }
        }

        if (!Array.isArray(outputTypes)) {
            outputTypes = outputTypes ? [outputTypes] : []
        }

        // Dual-mode behavior:
        // If no file and no output types requested, provide a helpful prompt response
        if (!file && (!outputTypes || outputTypes.length === 0)) {
            if (!prompt || !prompt.trim()) {
                return res.status(400).json({
                    message: "Please provide a prompt or upload a source document."
                })
            }

            return res.status(200).json({
                answer: "Welcome to CortexAI Crisis & Situation Communications Platform. To generate grounded advisories, summaries, presentations, video scripts, or social posts, please attach a source document (PDF, DOCX, TXT, HTML, or Image) and select your desired output formats in the panel.",
                results: null
            })
        }

        // Normalize output types if single type or empty with file
        if (outputTypes.length === 0 && file) {
            outputTypes = ["executiveSummary"]
        }

        // Fetch conversation history for context continuity
        const conversationHistory = await fetchConversationHistory(conversationId)

        // Invoke LangGraph workflow: ingest -> orchestrator
        const stateInput = {
            prompt: prompt || objective || "Generate communication outputs from source document",
            file,
            userId,
            conversationId,
            outputTypes,
            audience: audience || "general public",
            tone: tone || "formal",
            language: language || "English",
            detail: detail || "standard",
            objective: objective || prompt || "Generate communications",
            conversationHistory,
            evidenceContext: "",
            sourceChunks: [],
            results: {}
        }

        const finalState = await invokeWithRetry(stateInput)

        // Structure clean results map for client
        const formattedResults = {}
        if (finalState.results) {
            for (const [type, data] of Object.entries(finalState.results)) {
                formattedResults[type] = {
                    status: data.status,
                    answer: data.aiResponse || "",
                    artifacts: data.artifacts || [],
                    downloadUrl: data.artifacts?.[0]?.downloadUrl || null,
                    citations: data.citations || [],
                    validation: data.validation || null,
                    error: data.error || null
                }
            }
        }

        // Save job in agent MongoDB
        try {
            await Job.create({
                userId,
                conversationId,
                objective: objective || prompt,
                prompt,
                audience,
                tone,
                language,
                detail,
                outputTypes,
                sourceFileName: file?.originalname || "Direct Input",
                sourceMimeType: file?.mimetype || "text/plain",
                results: formattedResults,
                status: "completed"
            })
        } catch (dbErr) {
            console.log("Job persistence error (non-fatal):", dbErr.message)
        }

        return res.status(200).json({
            results: formattedResults,
            answer: finalState.aiResponse || "Generation complete.",
            sourceChunks: finalState.sourceChunks || []
        })

    } catch (error) {
        console.log("Agent controller error:", error)
        next(error)
    }
}

export const getJobs = async (req, res, next) => {
    try {
        const userId = req.headers["x-user-id"] || "anonymous"
        const jobs = await Job.find({ userId }).sort({ createdAt: -1 }).limit(30)
        return res.status(200).json(jobs)
    } catch (error) {
        next(error)
    }
}