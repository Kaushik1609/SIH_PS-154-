import { StateGraph } from "@langchain/langgraph";
import { agentState } from "./state.js";
import { ingestAgent } from "../agents/ingest.agent.js";
import { orchestrator } from "./orchestrator.js";

const workflow = new StateGraph(agentState);

workflow.addNode("ingest", ingestAgent);
workflow.addNode("orchestrator", orchestrator);

workflow.addEdge("__start__", "ingest");
workflow.addEdge("ingest", "orchestrator");
workflow.addEdge("orchestrator", "__end__");

export const graph = workflow.compile();