import React, { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import MessageBubble from './MessageBubble'
import LoadingAnimation from './LoadingAnimation'
import { Shield, FileText, Sparkles, CheckCircle2 } from 'lucide-react'

function MessageList() {
    const { selectedConversation } = useSelector(state => state.conversation)
    const { messages, isLoading } = useSelector(state => state.message)
    const bottomRef = useRef(null)

    useEffect(() => {
        requestAnimationFrame(() => {
            bottomRef?.current?.scrollIntoView({
                behavior: "smooth",
                block: "end"
            })
        })
    }, [messages?.length, isLoading])

    return (
        <div className='flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {messages.length === 0 || !selectedConversation ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-center max-w-lg mx-auto py-10">
                    <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        <Shield size={32} />
                    </div>

                    <div className='flex flex-col gap-1.5'>
                        <h1 className='text-[22px] font-bold text-slate-100 tracking-tight'>
                            CortexAI Crisis Intelligence
                        </h1>
                        <p className='text-sm text-slate-400 max-w-md leading-relaxed'>
                            Upload a disaster report or situation briefing to generate grounded advisories, executive summaries, presentations, video scripts, and social communications in parallel.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-3 text-left">
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-slate-200">Grounded Evidence</p>
                                <p className="text-[11px] text-slate-500">Every claim cited against source chunks</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
                            <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-slate-200">Multi-Format Parallel</p>
                                <p className="text-[11px] text-slate-500">7 formats generated simultaneously</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='space-y-4 max-w-5xl mx-auto'>
                    {messages.map((msg, i) => (
                        <div key={i}>
                            <MessageBubble
                                role={msg?.role}
                                content={msg?.content}
                                images={msg?.images || []}
                                results={msg?.results || null}
                            />
                        </div>
                    ))}

                    {isLoading && (
                        <div className="max-w-5xl mx-auto">
                            <LoadingAnimation />
                        </div>
                    )}
                </div>
            )}
            <div ref={bottomRef} />
        </div>
    )
}

export default MessageList
