import mongoose from "mongoose"

const connectDb = async () => {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        console.warn("[MongoDB Warning] MONGODB_URI is not defined in environment variables.")
        return
    }

    mongoose.connection.on("error", (err) => {
        console.error(`[MongoDB Error] Post-connection error: ${err.message || err}`)
    })

    mongoose.connection.on("disconnected", () => {
        console.warn("[MongoDB Warning] Disconnected from database.")
    })

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 })
        console.log("agent db connected successfully")
    } catch (error) {
        console.warn(`[MongoDB Warning] Initial connection failure: ${error.message}. Running without persistent DB caching.`)
    }
}

export default connectDb