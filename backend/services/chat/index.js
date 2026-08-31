import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/chat.routes.js"

dotenv.config()

const port = process.env.PORT || 8002
const app = express()

app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use("/", router)
app.get("/", (req, res) => {
    res.json({ message: "hello from chat" })
})

const startServer = async () => {
    await connectDb()
    app.listen(port, () => {
        console.log(`chat started at ${port}`)
    })
}

startServer()
