import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

let groqInstance = null
let geminiInstance = null

function getGroq() {
    if (!groqInstance) {
        const apiKey = process.env.GROQ_API_KEY || "dummy-key"
        groqInstance = new ChatGroq({
            model: "openai/gpt-oss-120b",
            temperature: 0.7,
            maxTokens: 4096,
            apiKey
        })
    }
    return groqInstance
}

function getGemini() {
    if (!geminiInstance) {
        const apiKey = process.env.GOOGLE_API_KEY || "dummy-key"
        geminiInstance = new ChatGoogleGenerativeAI({
            model: "gemini-3.6-flash",
            temperature: 0.7,
            maxOutputTokens: 4096,
            apiKey
        })
    }
    return geminiInstance
}

export const getModel = async (agent) => {
    const hasGroq = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("add your")
    const hasGoogle = process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes("add your")

    switch (agent) {
        case "ingest":
        case "document":
        case "presentation":
        case "social":
        case "validate":
        default:
            if (hasGoogle) return getGemini()
            if (hasGroq) return getGroq()
            return getGemini()
    }
}

