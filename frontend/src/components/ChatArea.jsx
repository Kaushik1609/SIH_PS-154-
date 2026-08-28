import React, { useEffect } from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useDispatch, useSelector } from 'react-redux'
import getMessages from '../features/getMessages'
import { setMessages } from '../redux/messageSlice'

function ChatArea() {
  const { selectedConversation } = useSelector(state => state.conversation)
  const dispatch = useDispatch()

  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedConversation && selectedConversation._id) {
        if (selectedConversation.title === "New Chat" || selectedConversation.title === "New Incident") return
        const data = await getMessages(selectedConversation._id)
        if (Array.isArray(data)) {
          dispatch(setMessages(data))
        }
      }
    }
    fetchMessages()
  }, [selectedConversation?._id])

  return (
    <div className='flex-1 flex flex-col min-w-0 bg-[#0c0e14]'>
      <Nav />
      <MessageList />
      <ChatInput />
    </div>
  )
}

export default ChatArea
