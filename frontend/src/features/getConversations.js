import api from "../../utils/axios"

export const getConversations = async () => {
    try {
        const { data } = await api.get("/api/chat/get-conversations")
        return Array.isArray(data) ? data : []
    } catch (error) {
        console.log("Get conversations error:", error.message)
        return []
    }
}