import { graph } from "../graph/graph.js"
import Job from "../models/job.model.js"

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
            evidenceContext: "",
            sourceChunks: [],
            results: {}
        }

        const finalState = await graph.invoke(stateInput)

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