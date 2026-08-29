import fs from "fs"
import fsPromises from "fs/promises"
import mammoth from "mammoth"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { vectorStore } from "../config/vectorDb.js"
import { getModel } from "../config/llmModels.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { checkAgentLimit } from "../config/agentLimit.js"

/**
 * Agent 1 — Ingestion + Grounding
 * 
 * Merges imageAnalyzer (OCR/vision-QA) and pdfRag (chunk/embed/retrieve) into
 * one shared step that runs once per job, regardless of how many output formats
 * are requested. Populates state.evidenceContext and state.sourceChunks.
 */
export const ingestAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "ingest")

    let extractedText = ""
    let confidence = 1.0
    let sourceId = `src-${Date.now()}`

    // ── Branch on input type ───────────────────────────────────────────────
    if (state.file) {
      const mimetype = state.file.mimetype || ""
      console.log(`[Ingest] Processing file: ${state.file.originalname || state.file.path}, mimetype: ${mimetype}`)

      if (mimetype === "application/pdf") {
        // PDF extraction via pdf-parse
        const { PDFParse } = await import("pdf-parse")
        const buffer = fs.readFileSync(state.file.path)
        console.log(`[Ingest] PDF buffer size: ${buffer.length} bytes`)
        const pdf = new PDFParse({ data: buffer })
        const result = await pdf.getText()
        extractedText = result.text
        console.log(`[Ingest] PDF extracted text length: ${extractedText.length} chars`)
      } else if (
        mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimetype === "application/msword"
      ) {
        // DOCX extraction via mammoth
        const buffer = fs.readFileSync(state.file.path)
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
        console.log(`[Ingest] DOCX extracted text length: ${extractedText.length} chars`)

      } else if (mimetype === "text/plain") {
        // Plain text
        extractedText = fs.readFileSync(state.file.path, "utf-8")
        console.log(`[Ingest] TXT extracted text length: ${extractedText.length} chars`)

      } else if (mimetype === "text/html") {
        // HTML — strip tags, keep text
        const raw = fs.readFileSync(state.file.path, "utf-8")
        extractedText = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
        console.log(`[Ingest] HTML extracted text length: ${extractedText.length} chars`)

      } else if (mimetype.startsWith("image/")) {
        // Image — multimodal LLM text extraction (reuse Gemini)
        const llm = await getModel("ingest")
        const imageBuffer = await fsPromises.readFile(state.file.path)
        const base64Image = imageBuffer.toString("base64")

        const messages = [
          new SystemMessage(
            `You are a document analysis agent. Extract ALL text, data, tables, figures, and descriptions from this image. Be thorough and preserve the structure. If this is a scanned document, perform OCR. Return the extracted content as plain text.`
          ),
          new HumanMessage({
            content: [
              {
                type: "text",
                text: state.prompt || "Extract all text and information from this image."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimetype};base64,${base64Image}`
                }
              }
            ]
          })
        ]

        const response = await llm.invoke(messages)
        extractedText = response.content
        confidence = 0.85 // OCR/vision extraction has lower confidence
        console.log(`[Ingest] Image extracted text length: ${extractedText.length} chars`)

      } else if (
        mimetype.startsWith("audio/") ||
        mimetype.startsWith("video/")
      ) {
        // TODO: speech-to-text ingestion — not implemented, no STT dependency in this repo yet
        return {
          ...state,
          aiResponse: "Unsupported source type: audio/video ingestion is not yet supported. Please upload a PDF, DOCX, TXT, HTML, or image file.",
          evidenceContext: "",
          sourceChunks: [],
          results: {}
        }

      } else {
        return {
          ...state,
          aiResponse: `Unsupported file type: ${mimetype}. Please upload a PDF, DOCX, TXT, HTML, or image file.`,
          evidenceContext: "",
          sourceChunks: [],
          results: {}
        }
      }

    } else if (state.prompt) {
      // Free-form pasted text — normalize directly
      extractedText = state.prompt
      console.log(`[Ingest] Using prompt text, length: ${extractedText.length} chars`)

    } else {
      return {
        ...state,
        aiResponse: "No source document or text provided. Please upload a file or paste text.",
        evidenceContext: "",
        sourceChunks: [],
        results: {}
      }
    }

    // ── Guard: fail early if extraction produced nothing ────────────────────
    const cleanedText = extractedText.replace(/\s+/g, " ").trim()
    if (!cleanedText || cleanedText.length < 20) {
      console.error(`[Ingest] EMPTY OR NEAR-EMPTY extraction (${cleanedText.length} chars). Aborting.`)
      return {
        ...state,
        aiResponse: "Failed to extract meaningful text from the uploaded document. The file may be empty, corrupted, or contain only images without OCR-readable text. Please try a different file.",
        evidenceContext: "",
        sourceChunks: [],
        results: {}
      }
    }

    // ── Chunk, embed, and index ────────────────────────────────────────────
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    })

    const docs = await splitter.createDocuments([extractedText])
    const collectionName = `job-${Date.now()}`
    console.log(`[Ingest] Created ${docs.length} chunks from ${extractedText.length} chars of text`)

    // Attach anchors to each chunk
    const sourceChunks = docs.map((doc, index) => ({
      chunkId: `${sourceId}-chunk-${index}`,
      sourceId,
      paragraphIndex: index,
      uploadingUserId: state.userId,
      extractionTimestamp: new Date().toISOString(),
      language: state.language || "auto",
      confidence,
      content: doc.pageContent
    }))

    // ── Decide retrieval strategy based on document size ────────────────────
    // For small documents (≤ 25 chunks), use ALL chunks — don't lose content
    // For large documents, use vector similarity search with high k
    let relevantChunks

    if (docs.length <= 25) {
      // Small document — use everything, no information loss
      console.log(`[Ingest] Small document (${docs.length} chunks), using ALL chunks as evidence`)
      relevantChunks = sourceChunks
    } else {
      // Large document — index and retrieve top-k
      const store = await vectorStore(docs, collectionName)
      const query = state.objective || state.prompt || "summarize the document"
      const retrieveK = Math.min(docs.length, 20) // retrieve up to 20 chunks
      console.log(`[Ingest] Large document (${docs.length} chunks), retrieving top ${retrieveK} via similarity search`)
      const relevantDocs = await store.similaritySearch(query, retrieveK)

      // Map retrieved docs back to their source chunks with anchors
      relevantChunks = relevantDocs.map((doc) => {
        const matched = sourceChunks.find(sc => sc.content === doc.pageContent)
        return matched || {
          chunkId: `${sourceId}-retrieved`,
          sourceId,
          paragraphIndex: -1,
          uploadingUserId: state.userId,
          extractionTimestamp: new Date().toISOString(),
          language: state.language || "auto",
          confidence,
          content: doc.pageContent
        }
      })
    }

    const evidenceContext = relevantChunks.map(c => c.content).join("\n\n")
    console.log(`[Ingest] Final evidenceContext: ${evidenceContext.length} chars from ${relevantChunks.length} chunks`)

    return {
      ...state,
      evidenceContext,
      sourceChunks: relevantChunks
    }

  } catch (error) {
    console.error("[Ingest] Agent error:", error)
    return {
      ...state,
      aiResponse: error?.message || error?.data?.message || "Failed to ingest and process document.",
      evidenceContext: "",
      sourceChunks: [],
      results: {}
    }
  } finally {
    // Clean up uploaded file
    if (state.file?.path) {
      try {
        fs.unlinkSync(state.file.path)
      } catch (e) {
        // File may already be deleted
      }
    }
  }
}
