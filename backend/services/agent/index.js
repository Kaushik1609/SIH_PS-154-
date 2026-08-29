import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/agent.route.js"
dotenv.config()

const port = process.env.PORT || 8003
const app = express()

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use("/", router)

app.use((err, req, res, next) => {
    console.log(err)

    if (err.status) {
        return res.status(err.status).json(err.data)
    }

    return res.status(500).json({ message: `agent error ${err.message || err}` })
})

app.get("/", (req, res) => {
    res.json({ message: "hello from agent" })
})

const startServer = async () => {
    await connectDb()
    app.listen(port, () => {
        console.log(`agent started at ${port}`)
    })
}

startServer()
