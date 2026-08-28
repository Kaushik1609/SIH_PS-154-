import redis from "../../../shared/redis/redis.js"

const Limits = {
    ingest: 50,
    document: 50,
    presentation: 50,
    social: 50
}

export const checkAgentLimit = async (userId, agent) => {
    const max = Limits[agent] || 50
    try {
        const key = `rate:${userId || "anonymous"}:${agent}`
        const count = await redis.incr(key)
        if (count === 1) {
            await redis.expire(key, 60)
        }

        const ttl = await redis.ttl(key)

        if (count > max) {
            const minutes = Math.floor(ttl / 60)
            const seconds = (ttl % 60)
            const time = minutes > 0 ? ` ${minutes}m : ${seconds}s` : `${seconds}s`

            const error = new Error(`Rate limit exceeded for ${agent}.`)
            error.status = 429
            error.data = {
                success: false,
                agent,
                limit: max,
                remainingTime: ttl,
                retryAfter: time,
                message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${time}.`
            }
            throw error
        }

        return { remaining: max - count, limit: max }
    } catch (err) {
        if (err.status === 429) throw err
        // If Redis is offline or unreachable, allow request gracefully
        return { remaining: max, limit: max }
    }
}