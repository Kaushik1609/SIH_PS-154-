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
            // If backend auth service is not running locally, create a local session
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
            console.log("Firebase login issue (API key not configured in .env):", err.message)
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
        <div className='h-screen flex bg-[#0c0e14] text-white overflow-hidden'>
            <SideBar />
            <ChatArea />

            {!userData && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4'>
                    <div className='w-full max-w-[380px] bg-[#12141d] border border-white/[0.09] rounded-3xl p-7 flex flex-col gap-5 shadow-2xl'>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
                                <Shield size={26} />
                            </div>
                            <div>
                                <h2 className='text-[18px] font-bold text-slate-100 tracking-tight'>CortexAI</h2>
                                <p className='text-[12px] text-slate-400'>Crisis Communications Engine</p>
                            </div>
                        </div>

                        <p className='text-[13px] text-slate-300 leading-relaxed'>
                            Generate grounded advisories, summaries, presentations, and social communications in parallel from uploaded disaster reports.
                        </p>

                        {loginError && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                                {loginError}
                            </div>
                        )}

                        <div className="flex flex-col gap-2.5">
                            <button
                                className='w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 transition duration-150 cursor-pointer shadow-lg'
                                onClick={googleLogin}
                            >
                                <FcGoogle size={17} />
                                Continue with Google
                            </button>

                            <button
                                className='w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition duration-150 cursor-pointer shadow-lg shadow-indigo-600/20'
                                onClick={guestLogin}
                            >
                                <UserCheck size={16} />
                                Continue as Guest / Demo Mode
                            </button>
                        </div>

                        <div className="flex items-center gap-1.5 justify-center text-[11px] text-slate-500">
                            <Sparkles size={12} className="text-indigo-400" />
                            <span>Full multi-agent generator & preview access</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home
