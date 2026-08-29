import React, { useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import MessageBubble from './MessageBubble'
import LoadingAnimation from './LoadingAnimation'
import { Shield, CheckCircle2, Sparkles } from 'lucide-react'

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
        <div className='flex-1 overflow-y-auto px-3 md:px-6 py-4 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {messages.length === 0 || !selectedConversation ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center max-w-md mx-auto py-8">
                    <div
                        className="p-2.5 rounded-sm boxy-curve border shrink-0"
                        style={{
                            backgroundColor: 'var(--accent-subtle)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--accent)'
                        }}
                    >
                        <Shield size={24} />
                    </div>

                    <div className='flex flex-col gap-1'>
                        <h1
                            className='text-base font-bold tracking-tight'
                            style={{ color: 'var(--text-primary)' }}
                        >
                            CortexAI Crisis Intelligence
                        </h1>
                        <p
                            className='text-xs leading-relaxed max-w-sm'
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Upload a situation briefing or disaster report to generate verified advisories, executive summaries, presentations, and social communications.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-2 text-left">
                        <div
                            className="p-2.5 rounded-sm boxy-curve border flex items-start gap-2"
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderColor: 'var(--border-color)'
                            }}
                        >
                            <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[11.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>Grounded Evidence</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Claims cited to source text</p>
                            </div>
                        </div>

                        <div
                            className="p-2.5 rounded-sm boxy-curve border flex items-start gap-2"
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderColor: 'var(--border-color)'
                            }}
                        >
                            <Sparkles size={14} style={{ color: 'var(--accent)' }} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[11.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>Multi-Format Sync</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Generated simultaneously</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='space-y-3 max-w-4xl mx-auto'>
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
                        <div className="max-w-4xl mx-auto">
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
