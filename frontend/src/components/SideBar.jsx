import React, { useState, useEffect } from 'react'
import {
    LogOut,
    Menu,
    PanelLeftIcon,
    PanelRight,
    PenSquare,
    Plus,
    User,
    X,
    FileSpreadsheet,
    Shield
} from "lucide-react"
import { useDispatch, useSelector } from 'react-redux'
import { getConversations } from '../features/getConversations'
import { addConversation, setConversations, setSelectedConversation } from '../redux/conversationSlice'
import { createConversation } from '../features/createConversation'
import logOut from '../features/logOut'
import { setUserdata } from '../redux/userSlice'

function SideBar() {
    const [collapsed, setCollapsed] = useState(false)
    const dispatch = useDispatch()
    const [imageError, setImageError] = useState(false)
    const { conversations, selectedConversation } = useSelector(state => state.conversation)
    const { userData } = useSelector(state => state.user)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const getConv = async () => {
            const data = await getConversations()
            dispatch(setConversations(data))
        }
        getConv()
    }, [userData?._id])

    const handleCreateConversation = async () => {
        const data = await createConversation()
        dispatch(addConversation(data))
        dispatch(setSelectedConversation(data))
    }

    if (collapsed) {
        return (
            <div
                className='hidden lg:flex flex-col items-center w-[48px] h-screen border-r py-3 gap-1 shrink-0'
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)'
                }}
            >
                <button
                    className='flex items-center justify-center w-8 h-8 rounded-sm boxy-curve border-none cursor-pointer mb-1'
                    style={{
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)'
                    }}
                    onClick={() => setCollapsed(false)}
                    title="Expand Sidebar"
                >
                    <PanelRight size={15} />
                </button>

                <button
                    className='flex items-center justify-center w-8 h-8 rounded-sm boxy-curve border-none cursor-pointer'
                    style={{
                        backgroundColor: 'var(--accent-subtle)',
                        color: 'var(--accent-text)'
                    }}
                    onClick={handleCreateConversation}
                    title="New Job / Session"
                >
                    <Plus size={15} />
                </button>

                <div className='flex-1 overflow-y-auto px-1.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-3 space-y-1'>
                    {conversations.map((conv) => {
                        const isActive = selectedConversation?._id === conv?._id
                        return (
                            <div
                                key={conv?._id}
                                onClick={() => dispatch(setSelectedConversation(conv))}
                                className='flex items-center justify-center cursor-pointer p-1.5 rounded-sm boxy-curve border transition-colors'
                                style={{
                                    backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                                    borderColor: isActive ? 'var(--accent)' : 'transparent',
                                    color: isActive ? 'var(--accent-text)' : 'var(--text-muted)'
                                }}
                            >
                                <FileSpreadsheet size={13} />
                            </div>
                        )
                    })}
                </div>

                <div className='shrink-0'>
                    {userData?.avatar && !imageError ? (
                        <img
                            className='w-7 h-7 rounded-sm object-cover border boxy-curve'
                            style={{ borderColor: 'var(--border-color)' }}
                            src={userData?.avatar}
                            alt="User"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div
                            className='w-7 h-7 rounded-sm flex items-center justify-center boxy-curve'
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)'
                            }}
                        >
                            <User size={13} />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <button
                className='lg:hidden fixed top-2 left-3 z-50 flex items-center justify-center w-7 h-7 rounded-sm boxy-curve border'
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-secondary)'
                }}
                onClick={() => setMobileOpen(true)}
            >
                <Menu size={13} />
            </button>

            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} className='lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs' />
            )}

            <div
                className={`fixed lg:static inset-y-0 left-0 z-50 w-[220px] h-screen shrink-0 border-r transition-transform duration-200 ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)'
                }}
            >
                <div className='flex flex-col h-full'>
                    {/* Header */}
                    <div
                        className='flex items-center gap-2 px-3 py-2.5 border-b'
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <div
                            className='hidden lg:flex items-center justify-center w-6 h-6 rounded-sm boxy-curve cursor-pointer'
                            style={{ color: 'var(--text-secondary)' }}
                            onClick={() => setCollapsed(true)}
                        >
                            <PanelLeftIcon size={14} />
                        </div>

                        <button
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden flex items-center justify-center w-6 h-6 rounded-sm boxy-curve bg-transparent border-none cursor-pointer"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <Shield size={15} style={{ color: 'var(--accent)' }} />
                            <span
                                className='text-[13.5px] font-bold tracking-tight truncate'
                                style={{ color: 'var(--text-primary)' }}
                            >
                                CortexAI
                            </span>
                        </div>

                        <button
                            className='flex items-center justify-center w-6 h-6 rounded-sm boxy-curve border-none cursor-pointer'
                            style={{
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)'
                            }}
                            onClick={handleCreateConversation}
                            title="New Job Session"
                        >
                            <PenSquare size={13} />
                        </button>
                    </div>

                    {/* New Job Button */}
                    <div className='px-2.5 pt-2.5 pb-1'>
                        <button
                            className='w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded-sm boxy-curve py-1.5 px-2 border-none cursor-pointer transition'
                            style={{
                                backgroundColor: 'var(--accent)',
                                color: '#ffffff'
                            }}
                            onClick={handleCreateConversation}
                        >
                            <Plus size={13} />
                            New Incident
                        </button>
                    </div>

                    {/* Recent Sessions Header */}
                    <div
                        className='px-3 pt-2 pb-1 text-[9.5px] font-semibold uppercase tracking-wider'
                        style={{ color: 'var(--text-muted)' }}
                    >
                        {conversations.length === 0 ? "No Recent Jobs" : "Recent Jobs"}
                    </div>

                    {/* Sessions List */}
                    <div className='flex-1 overflow-y-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-0.5'>
                        {conversations?.map((conv) => {
                            const isActive = selectedConversation?._id === conv?._id
                            return (
                                <div
                                    key={conv?._id}
                                    onClick={() => dispatch(setSelectedConversation(conv))}
                                    className='flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-sm boxy-curve border transition-colors'
                                    style={{
                                        backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                                        borderColor: isActive ? 'var(--accent)' : 'transparent'
                                    }}
                                >
                                    <div
                                        className='flex items-center justify-center shrink-0 w-5 h-5 rounded-xs boxy-curve'
                                        style={{
                                            backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-tertiary)',
                                            color: isActive ? '#ffffff' : 'var(--text-muted)'
                                        }}
                                    >
                                        <FileSpreadsheet size={11} />
                                    </div>
                                    <span
                                        className='text-[11.5px] font-medium truncate'
                                        style={{
                                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {conv?.title || "New Incident"}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* User Profile Bar */}
                    <div className='mx-2 h-px' style={{ backgroundColor: 'var(--border-color)' }} />
                    <div className='px-2 py-2'>
                        {userData ? (
                            <div
                                className='flex items-center gap-2 rounded-sm boxy-curve px-2 py-1.5 transition'
                                style={{ backgroundColor: 'transparent' }}
                            >
                                <div className='shrink-0'>
                                    {userData?.avatar && !imageError ? (
                                        <img
                                            className='w-7 h-7 rounded-sm object-cover border boxy-curve'
                                            style={{ borderColor: 'var(--border-color)' }}
                                            src={userData?.avatar}
                                            alt="User"
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div
                                            className='w-7 h-7 rounded-sm flex items-center justify-center boxy-curve'
                                            style={{
                                                backgroundColor: 'var(--bg-tertiary)',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            <User size={13} />
                                        </div>
                                    )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <p
                                        className='text-[11px] font-semibold truncate leading-tight'
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {userData?.name || "User"}
                                    </p>
                                    <p
                                        className='text-[9.5px] truncate leading-tight'
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        {userData?.email || "Disaster Response Staff"}
                                    </p>
                                </div>
                                <button
                                    title="Sign Out"
                                    className='flex items-center justify-center w-6 h-6 rounded-sm boxy-curve border-none bg-transparent cursor-pointer'
                                    style={{ color: 'var(--text-muted)' }}
                                    onClick={() => {
                                        logOut()
                                        dispatch(setUserdata(null))
                                    }}
                                >
                                    <LogOut size={13} />
                                </button>
                            </div>
                        ) : (
                            <div
                                className='text-center py-1 text-[11px]'
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Please login
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default SideBar
