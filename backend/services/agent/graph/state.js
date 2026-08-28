import { Annotation } from "@langchain/langgraph";

export const agentState = Annotation.Root({
  prompt: Annotation(),
  file: Annotation(),
  userId: Annotation(),
  conversationId: Annotation(),

  // Dashboard control fields
  outputTypes: Annotation(),     // e.g. ["advisory","linkedin","twitter","presentation"]
  audience: Annotation(),        // e.g. "general public", "policymakers", "media"
  tone: Annotation(),            // e.g. "formal", "urgent", "conversational"
  language: Annotation(),        // e.g. "English", "Hindi"
  detail: Annotation(),          // e.g. "brief", "standard", "detailed"
  objective: Annotation(),       // free-text objective from user

  // Conversation memory (populated by agent.controller.js from prior messages)
  conversationHistory: Annotation(), // [{ role: "user"|"assistant", content: string }]

  // Grounding (populated once by ingest.agent.js)
  evidenceContext: Annotation(),  // joined text for prompting
  sourceChunks: Annotation(),     // structured array with anchors for citation resolution

  // Fan-out results
  results: Annotation(),          // { [outputType]: { status, aiResponse, artifacts, citations, validation } }

  // Legacy single-agent fields — kept for backward compatibility
  aiResponse: Annotation(),
  agent: Annotation(),
  images: Annotation(),
  artifacts: Annotation()
})