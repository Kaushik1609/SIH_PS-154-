import { QdrantVectorStore } from "@langchain/qdrant"
import { embeddings } from "./embeddings.js"
import dotenv from "dotenv"
dotenv.config()

export const vectorStore = async (docs, collectionName) => {
    // If Qdrant and embeddings are configured and reachable
    if (embeddings && process.env.QDRANT_URL && !process.env.QDRANT_URL.includes("add qdrant")) {
        try {
            return await QdrantVectorStore.fromDocuments(docs, embeddings, {
                url: process.env.QDRANT_URL,
                apiKey: process.env.QDRANT_API_KEY,
                collectionName
            })
        } catch (err) {
            console.log("[VectorStore] Qdrant connection failed, using local document store:", err.message)
        }
    }

    // Robust local in-memory fallback
    return {
        async similaritySearch(query, k = 5) {
            const queryWords = (query || "").toLowerCase().split(/\s+/).filter(w => w.length > 2)
            const scored = docs.map(doc => {
                const text = (doc.pageContent || "").toLowerCase()
                let score = 0
                queryWords.forEach(w => {
                    if (text.includes(w)) score += 1
                })
                return { doc, score }
            })

            scored.sort((a, b) => b.score - a.score)
            return scored.slice(0, k).map(s => s.doc)
        }
    }
}