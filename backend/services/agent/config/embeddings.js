import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv"
dotenv.config()

export const embeddings = (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes("add your"))
  ? new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004",
      apiKey: process.env.GOOGLE_API_KEY
    })
  : null;