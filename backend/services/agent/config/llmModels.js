import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

// Groq LLM instance (tested and verified)
const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.7,
    apiKey: process.env.GROQ_API_KEY
})

// Google Gemini instance (tested and verified)
const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-3.6-flash",
    temperature: 0.7,
    apiKey: process.env.GOOGLE_API_KEY
})

export const getModel = async (agent) => {
    const hasGroq = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes("add your");
    const hasGoogle = process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes("add your");

    switch (agent) {
        case "ingest":
            if (hasGoogle) return gemini;
            return groq;
        case "document":
        case "presentation":
        case "social":
        case "validate":
        default:
            if (hasGroq) return groq;
            if (hasGoogle) return gemini;
            return groq;
    }
}
