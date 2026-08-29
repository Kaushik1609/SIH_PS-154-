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
import saveMessage from '../features/saveMessage'
import { addMessage, setIsLoading } from '../redux/messageSlice'
import { createConversation } from '../features/createConversation'
import { addConversation, setConvTitle, setSelectedConversation } from '../redux/conversationSlice'
import { updateConversation } from '../features/updateConversation'

const OUTPUT_OPTIONS = [
  { id: "advisory", label: "Advisory", icon: FileText },
  { id: "executivesummary", label: "Executive Summary", icon: FileText },
  { id: "videoscript", label: "Video Script", icon: Video },
  { id: "presentation", label: "Presentation", icon: Presentation },
  { id: "infographic", label: "Infographic", icon: BarChart3 },
  { id: "linkedin", label: "LinkedIn", icon: FaLinkedin },
  { id: "twitter", label: "X / Twitter", icon: FaXTwitter }
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
  { id: "brief", label: "Brief" },
  { id: "standard", label: "Standard" },
  { id: "long", label: "Detailed" }
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
      setPanelOpen(true)
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

    if (conversation.title === "New Chat" || conversation.title === "New Incident") {
      const newTitle = selectedFile ? selectedFile.name.slice(0, 30) : promptText.slice(0, 30)
      await updateConversation({ id: conversation?._id, title: newTitle })
      dispatch(setConvTitle({ conversationId: conversation?._id, title: newTitle }))
    }

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

    const userMsg = {
      role: "user",
      content: promptText,
      images: selectedFile && selectedFile.type.startsWith("image/") ? [URL.createObjectURL(selectedFile)] : []
    }
    dispatch(addMessage(userMsg))

    saveMessage({
      conversationId: conversation?._id,
      role: "user",
      content: promptText,
      images: [],
      artifacts: []
    })

    setValue("")
    setSelectedFile(null)

    const response = await sendMessage(formData)
    dispatch(setIsLoading(false))

    const assistantContent = response?.answer || "Generation completed."

    dispatch(addMessage({
      role: "assistant",
      content: assistantContent,
      results: response?.results || null,
      sourceChunks: response?.sourceChunks || []
    }))

    saveMessage({
      conversationId: conversation?._id,
      role: "assistant",
      content: assistantContent,
      artifacts: response?.results ? [{ type: "results", data: response.results }] : []
    })
  }

  const isGenerationMode = selectedFile || selectedOutputs.length > 0

  return (
    <div
      className="w-full px-3 py-2 border-t shrink-0"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-color)'
      }}
    >
      {/* Constrained width container to keep search bar and controls compact */}
      <div className="max-w-2xl mx-auto flex flex-col gap-1.5">

        {/* Expandable Generation Panel (Boxy with hover curve on interactive sub-elements) */}
        {panelOpen && (
          <div
            className="flex flex-col gap-2.5 p-2.5 rounded-sm boxy-curve border text-xs"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)'
            }}
          >
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
              className="flex flex-col items-center justify-center p-2.5 rounded-sm boxy-curve border border-dashed transition cursor-pointer"
              style={{
                borderColor: isDragging ? 'var(--accent)' : 'var(--border-color)',
                backgroundColor: isDragging ? 'var(--accent-subtle)' : 'var(--bg-tertiary)'
              }}
            >
              <UploadCloud size={18} style={{ color: selectedFile ? 'var(--accent)' : 'var(--text-muted)' }} />
              <p
                className="text-[11.5px] font-medium mt-1 truncate max-w-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                {selectedFile ? selectedFile.name : "Click or drop situation document here"}
              </p>
              <p
                className="text-[10px] mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                PDF, DOCX, TXT, HTML, Images
              </p>
            </div>

            {/* Output Formats Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Output Formats:
                </span>
                <button
                  onClick={selectAllOutputs}
                  className="text-[10px] font-medium cursor-pointer"
                  style={{ color: 'var(--accent-text)' }}
                >
                  {selectedOutputs.length === OUTPUT_OPTIONS.length ? "Clear All" : "Select All"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {OUTPUT_OPTIONS.map((opt) => {
                  const isSelected = selectedOutputs.includes(opt.id)
                  const Icon = opt.icon
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleOutput(opt.id)}
                      className="flex items-center gap-1.5 p-1.5 rounded-sm boxy-curve border cursor-pointer select-none text-[11px]"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={12} style={{ color: 'var(--accent)' }} className="shrink-0" />
                      ) : (
                        <Square size={12} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
                      )}
                      <Icon size={12} className="shrink-0" />
                      <span className="font-medium truncate">{opt.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dropdowns Grid */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div>
                <label className="text-[10px] font-medium block mb-0.5" style={{ color: 'var(--text-muted)' }}>Audience</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full rounded-sm boxy-curve px-1.5 py-1 text-[11px] outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium block mb-0.5" style={{ color: 'var(--text-muted)' }}>Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-sm boxy-curve px-1.5 py-1 text-[11px] outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium block mb-0.5" style={{ color: 'var(--text-muted)' }}>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-sm boxy-curve px-1.5 py-1 text-[11px] outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {LANGUAGE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-medium block mb-0.5" style={{ color: 'var(--text-muted)' }}>Detail</label>
                <select
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  className="w-full rounded-sm boxy-curve px-1.5 py-1 text-[11px] outline-none border"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {DETAIL_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
            </div>

            {/* Objective Input */}
            <div>
              <input
                type="text"
                placeholder="Optional objective: e.g. Focus on immediate evacuation..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full rounded-sm boxy-curve px-2 py-1 text-[11px] outline-none border"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        )}

        {/* Toggle options strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-sm boxy-curve text-[11px] font-medium border cursor-pointer"
              style={{
                backgroundColor: panelOpen || isGenerationMode ? 'var(--accent-subtle)' : 'transparent',
                borderColor: panelOpen || isGenerationMode ? 'var(--accent)' : 'var(--border-color)',
                color: panelOpen || isGenerationMode ? 'var(--accent-text)' : 'var(--text-secondary)'
              }}
            >
              <SlidersHorizontal size={11} />
              <span>Options</span>
              {selectedOutputs.length > 0 && (
                <span
                  className="px-1 py-0.2 rounded-full text-[9px] text-white"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {selectedOutputs.length}
                </span>
              )}
              {panelOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {selectedFile && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-sm boxy-curve border text-[11px]"
                style={{
                  backgroundColor: 'var(--accent-subtle)',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent-text)'
                }}
              >
                <FileText size={11} />
                <span className="max-w-[100px] truncate">{selectedFile.name}</span>
                <button
                  onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = "" }}
                  className="hover:opacity-75 cursor-pointer ml-0.5"
                >
                  <X size={11} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SEARCH BAR COMPONENT - ONLY THIS COMPONENT IS CURVED (rounded-full / rounded-3xl) */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)'
          }}
        >
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
            className="flex items-center justify-center w-6 h-6 rounded-sm boxy-curve border-none cursor-pointer shrink-0"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-muted)'
            }}
          >
            <Paperclip size={14} />
          </button>

          <button
            onClick={toggleMic}
            title="Voice Dictation"
            className="flex items-center justify-center w-6 h-6 rounded-sm boxy-curve border-none cursor-pointer shrink-0"
            style={{
              backgroundColor: listening ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: listening ? '#ef4444' : 'var(--text-muted)'
            }}
          >
            {listening ? <Mic size={14} /> : <MicOff size={14} />}
          </button>

          {/* Curved Search Input Text */}
          <input
            type="text"
            placeholder={isGenerationMode ? "Add instructions or context..." : "Ask or prompt crisis response..."}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            value={value}
            className="flex-1 bg-transparent outline-none text-xs leading-normal min-w-0"
            style={{
              color: 'var(--text-primary)'
            }}
          />

          <button
            disabled={(!value.trim() && !selectedFile && !objective.trim()) || isLoading}
            onClick={handleSendMessage}
            className="flex items-center justify-center w-7 h-7 rounded-sm boxy-curve border-none cursor-pointer shrink-0 transition"
            style={{
              backgroundColor: (value.trim() || selectedFile || objective.trim()) && !isLoading ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: (value.trim() || selectedFile || objective.trim()) && !isLoading ? '#ffffff' : 'var(--text-muted)',
              cursor: (value.trim() || selectedFile || objective.trim()) && !isLoading ? 'pointer' : 'not-allowed'
            }}
          >
            {isGenerationMode ? <Sparkles size={13} /> : <Send size={12} />}
          </button>
        </div>
      </div>
    </div>
  )
}
