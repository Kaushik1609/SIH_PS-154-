import redis from "../../shared/redis/redis.js"

const protect = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session
        if (sessionId) {
            try {
                const session = await redis.get(`session-${sessionId}`)
                if (session) {
                    req.user = JSON.parse(session)
                    return next()
                }
            } catch (redisErr) {
                console.log("[Gateway Auth] Redis lookup failed, using fallback:", redisErr.message)
            }
        }

        // Fallback for development / demo mode
        req.user = {
            userId: "operator-user",
            name: "Emergency Responder",
            email: "responder@cortexai.org"
        }
        next()
    } catch (error) {
        req.user = { userId: "operator-user" }
        next()
    }
}

export default protect