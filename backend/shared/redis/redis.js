import Redis from "ioredis"

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"

const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
        // Retry with exponential backoff up to 2 seconds
        return Math.min(times * 100, 2000)
    }
})

redis.on("connect", () => {
    console.log("[Redis] Connected successfully")
})

redis.on("error", (err) => {
    // Suppress spamming unhandled error events when Redis is offline
})

export default redis