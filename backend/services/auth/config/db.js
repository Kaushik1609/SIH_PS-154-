import mongoose from "mongoose"

const connectDb = async () => {
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cortexai"

    mongoose.connection.on("error", (err) => {
        console.error(`[MongoDB Error] Post-connection error: ${err.message || err}`)
    })

    mongoose.connection.on("disconnected", () => {
        console.warn("[MongoDB Warning] Disconnected from database.")
    })

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 })
        console.log("auth db connected")
    } catch (error) {
        console.warn(`[MongoDB Warning] Auth database initial connection failure: ${error.message}. Running in offline/in-memory mode.`)
    }
}

export default connectDb