import { FileSpreadsheet } from 'lucide-react'
import React from 'react'
import { useSelector } from 'react-redux'

function Nav() {
  const { selectedConversation } = useSelector(state => state.conversation)
  const { messages } = useSelector(state => state.message)

  return (
    <>
      {selectedConversation && (
        <div className='h-13 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#0c0e14] shrink-0'>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className='flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0'>
              <FileSpreadsheet size={13} className="text-indigo-400" />
            </div>
            <div className='text-[13.5px] font-semibold text-slate-100 tracking-tight truncate'>
              {selectedConversation?.title || "Situation Brief"}
            </div>
          </div>
          <div className='text-[10px] font-medium text-slate-500 bg-white/[0.03] border border-white/[0.06] px-2.5 py-0.5 rounded-full shrink-0'>
            {messages?.length} {messages?.length === 1 ? "entry" : "entries"}
          </div>
        </div>
      )}
    </>
  )
}

export default Nav
