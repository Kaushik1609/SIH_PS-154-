import api from '../../utils/axios'

async function sendMessage(payload) {
  try {
    const { data } = await api.post("/api/agent/generate", payload, {
      headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : {}
    })
    return data
  } catch (error) {
    console.error("Backend API request error:", error)

    const errorMessage = error?.response?.data?.message 
      || error?.response?.data?.error 
      || error?.message 
      || "Unknown connection error"

    return {
      results: null,
      answer: `⚠️ **Generation Failed / Server Error**\n\n${errorMessage}\n\n*Please ensure your backend services (Gateway :8000 & Agent :8003) are running and API keys (Groq/Gemini) are properly configured in \`backend/services/agent/.env\`.*`
    }
  }
}

export default sendMessage
