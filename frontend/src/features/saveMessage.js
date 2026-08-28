import api from '../../utils/axios'

async function saveMessage({ conversationId, role, content, images, artifacts }) {
  try {
    const { data } = await api.post("/api/chat/save-message", {
      conversationId,
      role,
      content,
      images: images || [],
      artifacts: artifacts || []
    })
    return data
  } catch (error) {
    console.log("Save message error (non-fatal):", error.message)
    return null
  }
}

export default saveMessage
