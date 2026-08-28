import { documentAgent } from "../agents/document.agent.js"
import { presentationAgent } from "../agents/presentation.agent.js"
import { socialAgent } from "../agents/social.agent.js"
import { validateOutput } from "./validate.js"

/**
 * Orchestrator Node
 * 
 * Takes state after Ingestion Agent has populated evidenceContext and sourceChunks.
 * Fans out concurrently via Promise.allSettled to the corresponding agents.
 * Validates each output independently and accumulates into state.results.
 */
export const orchestrator = async (state) => {
  const outputTypes = state.outputTypes || []
  if (!outputTypes || outputTypes.length === 0) {
    return {
      ...state,
      results: {}
    }
  }

  const results = {}

  // Map each requested output type to its execution promise
  const tasks = outputTypes.map(async (outputType) => {
    const normType = outputType.toLowerCase().trim()
    let result = null

    try {
      switch (normType) {
        case "advisory":
        case "executivesummary":
        case "videoscript":
          result = await documentAgent(state, normType)
          break

        case "presentation":
        case "infographic":
          result = await presentationAgent(state, normType)
          break

        case "linkedin":
        case "twitter":
          result = await socialAgent(state, normType)
          break

        default:
          result = {
            status: "failed",
            error: `Unsupported output type: ${outputType}`
          }
      }
    } catch (err) {
      result = {
        status: "failed",
        error: err.message || "Execution failed"
      }
    }

    // Run validation if output succeeded
    if (result && result.status === "done") {
      const artifactData = result.artifacts?.[0]?.data || {}
      const validation = await validateOutput(normType, artifactData, {
        ...state,
        results
      })
      result.validation = validation
    }

    return { type: normType, result }
  })

  const settled = await Promise.allSettled(tasks)

  settled.forEach((item, index) => {
    const originalType = outputTypes[index]?.toLowerCase()?.trim() || `output-${index}`
    if (item.status === "fulfilled") {
      results[item.value.type] = item.value.result
    } else {
      results[originalType] = {
        status: "failed",
        error: item.reason?.message || "Task rejected"
      }
    }
  })

  return {
    ...state,
    results
  }
}
