import { signInWithPopup } from 'firebase/auth'
import React, { useState } from 'react'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'
import { FcGoogle } from "react-icons/fc"
import { Shield, Sparkles, UserCheck } from "lucide-react"
import { useDispatch, useSelector } from 'react-redux'
import { setUserdata } from '../redux/userSlice'
import SideBar from '../components/SideBar'
import ChatArea from '../components/ChatArea'

function Home() {
    const { userData } = useSelector(state => state.user)
    const [loginError, setLoginError] = useState("")
    const dispatch = useDispatch()

    const handleLogin = async (token) => {
        try {
            const { data } = await api.post("/api/auth/login", { token })
            dispatch(setUserdata(data))
        } catch (error) {
            console.log("Backend auth error, falling back to guest session:", error)
            dispatch(setUserdata({
                _id: "user-demo",
                name: "Response Operator",
                email: "operator@cortexai.org",
                plan: "Pro",
                avatar: null
            }))
        }
    }

    const googleLogin = async () => {
        setLoginError("")
        try {
            const data = await signInWithPopup(auth, googleProvider)
            const token = await data.user.getIdToken()
            await handleLogin(token)
        } catch (err) {
            console.log("Firebase login issue:", err.message)
            setLoginError("Firebase OAuth key is not configured. Use 'Continue as Guest' below to test the platform.")
        }
    }

    const guestLogin = () => {
        dispatch(setUserdata({
            _id: "user-guest-" + Date.now(),
            name: "Emergency Responder",
            email: "responder@cortexai.org",
            plan: "Mission Ready",
            avatar: null
        }))
    }

    return (
        <div
            className='h-screen flex overflow-hidden'
            style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
            }}
        >
            <SideBar />
            <ChatArea />

            {!userData && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4'>
                    <div
                        className='w-full max-w-[340px] border rounded-sm boxy-curve p-5 flex flex-col gap-4 shadow-xl'
                        style={{
                            backgroundColor: 'var(--modal-bg)',
                            borderColor: 'var(--border-color)'
                        }}
                    >
                        <div className="flex items-center gap-2.5">
                            <div
                                className="p-2 rounded-sm boxy-curve border"
                                style={{
                                    backgroundColor: 'var(--accent-subtle)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--accent)'
                                }}
                            >
                                <Shield size={20} />
                            </div>
                            <div>
                                <h2 className='text-sm font-bold tracking-tight' style={{ color: 'var(--text-primary)' }}>CortexAI</h2>
                                <p className='text-[11px]' style={{ color: 'var(--text-muted)' }}>Crisis Communications Engine</p>
                            </div>
                        </div>

                        <p className='text-xs leading-relaxed' style={{ color: 'var(--text-secondary)' }}>
                            Generate grounded advisories, summaries, presentations, and social communications from uploaded crisis reports.
                        </p>

                        {loginError && (
                            <div
                                className="p-2 rounded-sm boxy-curve text-[11px] leading-relaxed border"
                                style={{
                                    backgroundColor: 'rgba(217, 119, 6, 0.1)',
                                    borderColor: 'rgba(217, 119, 6, 0.25)',
                                    color: '#d97706'
                                }}
                            >
                                {loginError}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <button
                                className='w-full flex items-center justify-center gap-2 py-2 rounded-sm boxy-curve text-xs font-semibold border cursor-pointer transition'
                                style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                                onClick={googleLogin}
                            >
                                <FcGoogle size={15} />
                                Continue with Google
                            </button>

                            <button
                                className='w-full flex items-center justify-center gap-1.5 py-2 rounded-sm boxy-curve text-xs font-semibold text-white border-none cursor-pointer transition'
                                style={{
                                    backgroundColor: 'var(--accent)'
                                }}
                                onClick={guestLogin}
                            >
                                <UserCheck size={14} />
                                Continue as Guest / Demo
                            </button>
                        </div>

                        <div
                            className="flex items-center gap-1 justify-center text-[10px]"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <Sparkles size={11} style={{ color: 'var(--accent)' }} />
                            <span>Multi-format generator ready</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home
