import React, { useState, useEffect } from 'react'
import {
    LogOut,
    Menu,
    MessageSquare,
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
            <div className='hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#0c0e14] border-r border-white/[0.06] py-4 gap-1 shrink-0'>
                <button
                    className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors bg-transparent border-none cursor-pointer mb-1'
                    onClick={() => setCollapsed(false)}
                    title="Expand Sidebar"
                >
                    <PanelRight size={18} />
                </button>

                <button
                    className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors bg-transparent border-none cursor-pointer'
                    onClick={handleCreateConversation}
                    title="New Job / Session"
                >
                    <Plus size={18} />
                </button>

                <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-4'>
                    {conversations.map((conv) => {
                        const isActive = selectedConversation?._id === conv?._id
                        return (
                            <div
                                key={conv?._id}
                                onClick={() => dispatch(setSelectedConversation(conv))}
                                className={`flex items-center justify-center cursor-pointer mb-1 p-2 rounded-lg border transition-colors ${
                                    isActive
                                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                                        : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
                                }`}
                            >
                                <FileSpreadsheet size={14} />
                            </div>
                        )
                    })}
                </div>

                <div className='shrink-0'>
                    {userData?.avatar && !imageError ? (
                        <img
                            className='w-9 h-9 rounded-[10px] object-cover border border-indigo-500/30'
                            src={userData?.avatar}
                            alt="User"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className='w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center'>
                            <User size={15} className="text-slate-400" />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <button
                className='lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition'
                onClick={() => setMobileOpen(true)}
            >
                <Menu size={14} />
            </button>

            {mobileOpen && (
                <div onClick={() => setMobileOpen(false)} className='lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm' />
            )}

            <div className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] h-screen shrink-0 bg-[#0c0e14] border-r border-white/[0.06] transition-transform duration-200 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}>
                <div className='flex flex-col h-full'>
                    {/* Header */}
                    <div className='flex items-center gap-2.5 px-4 py-3.5 border-b border-white/[0.06]'>
                        <div
                            className='hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition cursor-pointer'
                            onClick={() => setCollapsed(true)}
                        >
                            <PanelLeftIcon size={16} />
                        </div>

                        <button
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-center gap-1.5 flex-1">
                            <Shield size={16} className="text-indigo-400" />
                            <span className='text-[15px] font-bold text-slate-100 tracking-tight'>
                                CortexAI
                            </span>
                        </div>

                        <button
                            className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition bg-transparent border-none cursor-pointer'
                            onClick={handleCreateConversation}
                            title="New Job Session"
                        >
                            <PenSquare size={14} />
                        </button>
                    </div>

                    {/* New Job Button */}
                    <div className='px-3.5 pt-3 pb-1'>
                        <button
                            className='w-full flex items-center justify-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl py-2.5 border-none cursor-pointer hover:opacity-90 transition'
                            onClick={handleCreateConversation}
                        >
                            <Plus size={14} />
                            New Job / Incident
                        </button>
                    </div>

                    {/* Recent Sessions List */}
                    <div className='px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500'>
                        {conversations.length === 0 ? "No Recent Jobs" : "Recent Jobs"}
                    </div>

                    <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-0.5'>
                        {conversations?.map((conv) => {
                            const isActive = selectedConversation?._id === conv?._id
                            return (
                                <div
                                    key={conv?._id}
                                    onClick={() => dispatch(setSelectedConversation(conv))}
                                    className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-xl border transition-colors ${
                                        isActive
                                            ? "bg-indigo-500/15 border-indigo-500/30"
                                            : "bg-transparent border-transparent hover:bg-white/[0.03]"
                                    }`}
                                >
                                    <div className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-lg ${
                                        isActive ? "bg-indigo-500/20 text-indigo-400" : "bg-white/[0.05] text-slate-500"
                                    }`}>
                                        <FileSpreadsheet size={13} />
                                    </div>
                                    <span className={`text-xs font-medium truncate ${
                                        isActive ? "text-slate-100" : "text-slate-400"
                                    }`}>
                                        {conv?.title || "New Incident"}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* User Profile Bar */}
                    <div className='mx-3 h-px bg-white/[0.06]' />
                    <div className='px-3 py-3'>
                        {userData ? (
                            <div className='flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/[0.04] transition'>
                                <div className='shrink-0'>
                                    {userData?.avatar && !imageError ? (
                                        <img
                                            className='w-8 h-8 rounded-lg object-cover border border-indigo-500/30'
                                            src={userData?.avatar}
                                            alt="User"
                                            onError={() => setImageError(true)}
                                        />
                                    ) : (
                                        <div className='w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center'>
                                            <User size={14} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div className='flex-1 min-w-0'>
                                    <p className='text-xs font-semibold text-slate-100 truncate'>{userData?.name || "User"}</p>
                                    <p className='text-[10px] text-slate-500 truncate'>{userData?.email || "Disaster Response Staff"}</p>
                                </div>
                                <button
                                    title="Sign Out"
                                    className='flex items-center justify-center w-7 h-7 rounded-lg border-none bg-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition cursor-pointer'
                                    onClick={() => {
                                        logOut()
                                        dispatch(setUserdata(null))
                                    }}
                                >
                                    <LogOut size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className='text-center py-1 text-xs text-slate-500'>
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
