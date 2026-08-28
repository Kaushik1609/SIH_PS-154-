import mongoose from "mongoose"

const jobSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    conversationId: { type: String },
    objective: { type: String },
    prompt: { type: String },
    audience: { type: String },
    tone: { type: String },
    language: { type: String },
    detail: { type: String },
    outputTypes: [{ type: String }],
    sourceFileName: { type: String },
    sourceMimeType: { type: String },
    results: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "completed" },
    createdAt: { type: Date, default: Date.now }
})

export default mongoose.model("Job", jobSchema)
