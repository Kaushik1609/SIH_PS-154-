import api from "../../utils/axios"

export const createConversation = async () => {
    try {
        const { data } = await api.get("/api/chat/create-conversation")
        if (data && data._id) return data
        return { _id: `incident-${Date.now()}`, title: "New Incident" }
    } catch (error) {
        console.log("Create conversation error (using local session):", error.message)
        return { _id: `incident-${Date.now()}`, title: "New Incident" }
    }
}