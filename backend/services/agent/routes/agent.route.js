import express from "express"
import { agent, getJobs } from "../controllers/agent.controller.js"
import multer from "../config/multer.js"

const router = express.Router()

router.post("/chat", multer.single("file"), agent)
router.post("/generate", multer.single("file"), agent)
router.get("/jobs", getJobs)

export default router