import mongoose from "mongoose"

const connectDb = async () => {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        console.error("[MongoDB Error] MONGODB_URI is not defined in environment variables.")
        process.exit(1)
    }

    mongoose.connection.on("error", (err) => {
        console.error(`[MongoDB Error] Post-connection error: ${err.message || err}`)
    })

    mongoose.connection.on("disconnected", () => {
        console.warn("[MongoDB Warning] Disconnected from database.")
    })

    try {
        await mongoose.connect(uri)
        console.log("db connected")
    } catch (error) {
        console.error(`[MongoDB Error] Initial connection failure: ${error.message || error}`)
        process.exit(1)
    }
}

export default connectDb