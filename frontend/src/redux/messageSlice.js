import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
  name: "message",
  initialState: {
    messages: [],
    isLoading: false,
    currentJobStatus: null // null | "ingesting" | "generating" | "validating" | "done"
  },
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },
    updateLastMessageResults: (state, action) => {
      if (state.messages.length > 0) {
        const lastMsg = state.messages[state.messages.length - 1]
        if (lastMsg.role === "assistant") {
          lastMsg.results = action.payload.results
          lastMsg.content = action.payload.content || lastMsg.content
        }
      }
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setCurrentJobStatus: (state, action) => {
      state.currentJobStatus = action.payload
    }
  }
})

export const {
  setMessages,
  addMessage,
  updateLastMessageResults,
  setIsLoading,
  setCurrentJobStatus
} = messageSlice.actions

export default messageSlice.reducer
