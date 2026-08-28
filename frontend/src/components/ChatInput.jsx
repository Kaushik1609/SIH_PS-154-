import React, { useEffect, useState, useRef } from 'react'
import {
  FileText,
  Video,
  Presentation,
  BarChart3,
  Paperclip,
  Mic,
  MicOff,
  Send,
  X,
  SlidersHorizontal,
  UploadCloud,
  CheckSquare,
  Square,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { FaLinkedin, FaXTwitter } from 'react-icons/fa6'
import { useDispatch, useSelector } from 'react-redux'
import sendMessage from '../features/sendMessage'
import { addMessage, setIsLoading } from '../redux/messageSlice'
import { createConversation } from '../features/createConversation'
import { addConversation, setConvTitle, setSelectedConversation } from '../redux/conversationSlice'
import { updateConversation } from '../features/updateConversation'

const OUTPUT_OPTIONS = [
  { id: "advisory", label: "Advisory", icon: FileText, desc: "Formal situation advisory" },
  { id: "executivesummary", label: "Executive Summary", icon: FileText, desc: "Key facts & decisions" },
  { id: "videoscript", label: "Video Script", icon: Video, desc: "Scene-by-scene script" },
  { id: "presentation", label: "Presentation (PPTX)", icon: Presentation, desc: "Slide deck with notes" },
  { id: "infographic", label: "Infographic", icon: BarChart3, desc: "Layout & statistics" },
  { id: "linkedin", label: "LinkedIn Post", icon: FaLinkedin, desc: "Engaging professional post" },
  { id: "twitter", label: "X / Twitter Post", icon: FaXTwitter, desc: "Thread or single post" }
]

const AUDIENCE_OPTIONS = [
  "General Public",
  "Policymakers & Leadership",
  "Emergency Responders",
  "Media & Press",
  "Internal Operations Staff"
]

const TONE_OPTIONS = [
  "Urgent & Authoritative",
  "Formal & Official",
  "Clear & Accessible",
  "Reassuring & Action-Oriented",
  "Neutral & Analytical"
]

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Regional Local"
]

const DETAIL_OPTIONS = [
  { id: "brief", label: "Brief (Quick Overview)" },
  { id: "standard", label: "Standard (Balanced)" },
  { id: "long", label: "Detailed (In-Depth)" }
]

export default function ChatInput() {
  const [value, setValue] = useState("")
  const [selectedOutputs, setSelectedOutputs] = useState(["advisory", "executivesummary"])
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  // Controls
  const [audience, setAudience] = useState("General Public")
  const [tone, setTone] = useState("Formal & Official")
  const [language, setLanguage] = useState("English")
  const [detail, setDetail] = useState("standard")
  const [objective, setObjective] = useState("")

  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const fileRef = useRef(null)
  const dispatch = useDispatch()

  const { selectedConversation } = useSelector(state => state.conversation)
  const { isLoading } = useSelector(state => state.message)

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event) => {
      let transcript = ""
      for (let index = event.resultIndex; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript
      }
      setValue(transcript)
    }

    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
  }, [])

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported in this browser.")
      return
    }
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }

  const toggleOutput = (id) => {
    setSelectedOutputs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAllOutputs = () => {
    if (selectedOutputs.length === OUTPUT_OPTIONS.length) {
      setSelectedOutputs([])
    } else {
      setSelectedOutputs(OUTPUT_OPTIONS.map(o => o.id))
    }
  }

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedFile(file)
      setPanelOpen(true) // auto open panel when file is attached
    }
  }

  const handleSendMessage = async () => {
    if ((!value.trim() && !selectedFile && !objective.trim()) || isLoading) return

    dispatch(setIsLoading(true))
    let conversation = selectedConversation
    if (!conversation) {
      const conv = await createConversation()
      dispatch(setSelectedConversation(conv))
      dispatch(addConversation(conv))
      conversation = conv
    }

    const promptText = value.trim() || objective.trim() || "Analyze uploaded document and generate requested formats."

    if (conversation.title === "New Chat" || conversation.title === "New Job") {
      const newTitle = selectedFile ? selectedFile.name.slice(0, 30) : promptText.slice(0, 30)
      await updateConversation({ id: conversation?._id, title: newTitle })
      dispatch(setConvTitle({ conversationId: conversation?._id, title: newTitle }))
    }

    // Prepare payload
    const formData = new FormData()
    formData.append("prompt", promptText)
    formData.append("conversationId", conversation?._id || "")
    formData.append("outputTypes", JSON.stringify(selectedOutputs))
    formData.append("audience", audience)
    formData.append("tone", tone)
    formData.append("language", language)
    formData.append("detail", detail)
    formData.append("objective", objective.trim() || promptText)

    if (selectedFile) {
      formData.append("file", selectedFile)
    }

    // Add user message to thread
    dispatch(addMessage({
      role: "user",
      content: promptText,
      images: selectedFile && selectedFile.type.startsWith("image/") ? [URL.createObjectURL(selectedFile)] : []
    }))

    // Reset input state
    setValue("")
    const fileUploaded = selectedFile
    setSelectedFile(null)

    // Call API
    const response = await sendMessage(formData)
    dispatch(setIsLoading(false))

    // Add assistant response to thread with results map
    dispatch(addMessage({
      role: "assistant",
      content: response?.answer || "Generation completed.",
      results: response?.results || null,
      sourceChunks: response?.sourceChunks || []
    }))
  }

  const isGenerationMode = selectedFile || selectedOutputs.length > 0

  return (
    <div className="w-full px-3 md:px-6 py-3 border-t border-white/[0.06] bg-[#0c0e14]">
      <div className="flex flex-col gap-2 bg-[#12141d] border border-white/[0.08] rounded-2xl p-3 shadow-2xl">
        
        {/* Toggle Bar for Generation Controls */}
        <div className="flex items-center justify-between px-1 pb-1 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                panelOpen || isGenerationMode
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Generation Controls</span>
              {selectedOutputs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px]">
                  {selectedOutputs.length} formats
                </span>
              )}
              {panelOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {selectedFile && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <FileText size={12} />
                <span className="max-w-[120px] truncate">{selectedFile.name}</span>
                <button
                  onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = "" }}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            Grounds all formats in one shared document pass
          </div>
        </div>

        {/* Expandable Generation Panel */}
        {panelOpen && (
          <div className="flex flex-col gap-3.5 p-3 rounded-xl bg-black/30 border border-white/[0.05] text-xs">
            
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed transition cursor-pointer ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500/10"
                  : selectedFile
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-white/10 hover:border-white/20 bg-white/[0.01]"
              }`}
            >
              <UploadCloud size={22} className={selectedFile ? "text-emerald-400" : "text-slate-400"} />
              <p className="text-xs font-medium text-slate-200 mt-1.5">
                {selectedFile ? selectedFile.name : "Drop disaster report or situation document here"}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports PDF, DOCX, TXT, HTML, and Images (up to 30MB)
              </p>
            </div>

            {/* Output Formats Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  Select Output Formats:
                </span>
                <button
                  onClick={selectAllOutputs}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {selectedOutputs.length === OUTPUT_OPTIONS.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {OUTPUT_OPTIONS.map((opt) => {
                  const isSelected = selectedOutputs.includes(opt.id)
                  const Icon = opt.icon
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleOutput(opt.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition select-none ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm shadow-indigo-500/10"
                          : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={14} className="text-indigo-400 shrink-0" />
                      ) : (
                        <Square size={14} className="text-slate-600 shrink-0" />
                      )}
                      <Icon size={14} className={isSelected ? "text-indigo-300" : "text-slate-500"} />
                      <span className="text-xs font-medium truncate">{opt.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dropdown Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 border-t border-white/[0.04]">
              {/* Audience */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Target Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Tone */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Communication Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Output Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Detail Level */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Detail Level</label>
                <select
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  className="w-full bg-[#161822] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                >
                  {DETAIL_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
            </div>

            {/* Objective Input */}
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Specific Mission Objective (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Highlight immediate evacuation routes and shelter capacities"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full bg-[#161822] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          placeholder={isGenerationMode ? "Add instructions or specific context for the outputs..." : "Ask a question or attach a document to generate communications..."}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          value={value}
          rows={2}
          className="w-full bg-transparent outline-none resize-none text-[13.5px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none]"
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.html,image/*"
              hidden
              ref={fileRef}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
              }}
            />

            <button
              onClick={() => fileRef.current?.click()}
              title="Attach Document"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition"
            >
              <Paperclip size={16} />
            </button>

            <button
              onClick={toggleMic}
              title="Voice Dictation"
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition ${
                listening ? "bg-red-500 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
              }`}
            >
              {listening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
          </div>

          <button
            disabled={(!value.trim() && !selectedFile && !objective.trim()) || isLoading}
            onClick={handleSendMessage}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-md ${
              (value.trim() || selectedFile || objective.trim()) && !isLoading
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/20"
                : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
            }`}
          >
            {isGenerationMode ? (
              <>
                <Sparkles size={14} />
                <span>Generate ({selectedOutputs.length})</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
