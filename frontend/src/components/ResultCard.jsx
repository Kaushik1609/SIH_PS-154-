import React, { useState } from 'react'
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Video,
  Presentation,
  BarChart3,
  Copy,
  Check,
  Edit3,
  ThumbsUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  ExternalLink
} from 'lucide-react'
import { FaLinkedin, FaXTwitter } from 'react-icons/fa6'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const TYPE_CONFIG = {
  advisory: { label: "Advisory", icon: FileText, color: "text-red-400 border-red-500/20 bg-red-500/10" },
  executivesummary: { label: "Executive Summary", icon: FileText, color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
  videoscript: { label: "Video Script", icon: Video, color: "text-purple-400 border-purple-500/20 bg-purple-500/10" },
  presentation: { label: "Presentation (PPTX)", icon: Presentation, color: "text-amber-400 border-amber-500/20 bg-amber-500/10" },
  infographic: { label: "Infographic Plan", icon: BarChart3, color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
  linkedin: { label: "LinkedIn Post", icon: FaLinkedin, color: "text-sky-400 border-sky-500/20 bg-sky-500/10" },
  twitter: { label: "X / Twitter Post", icon: FaXTwitter, color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10" }
}

export default function ResultCard({ type, data, onRegenerate }) {
  const normType = type?.toLowerCase()?.trim()
  const config = TYPE_CONFIG[normType] || {
    label: type,
    icon: FileText,
    color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10"
  }
  const Icon = config.icon

  const [copied, setCopied] = useState(false)
  const [approved, setApproved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState("")
  const [showValidation, setShowValidation] = useState(false)
  const [showCitations, setShowCitations] = useState(false)

  const status = data?.status || "done"
  const isFailed = status === "failed" || !data
  const downloadUrl = data?.downloadUrl || data?.artifacts?.[0]?.downloadUrl
  const artifactData = data?.artifacts?.[0]?.data
  const citations = data?.citations || artifactData?.citations || []
  const validation = data?.validation

  // Initial text preview representation
  const rawText = data?.answer || (typeof artifactData === "object" ? JSON.stringify(artifactData, null, 2) : String(data || ""))
  const displayText = editedText || rawText

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(artifactData || { content: displayText }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${normType}-output.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#11131a] overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg border ${config.color}`}>
            <Icon size={16} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">{config.label}</h4>
            <span className="text-[10px] text-slate-400 capitalize">
              {status === "done" ? (approved ? "Approved" : "Ready for Review") : status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Validation Status Badge */}
          {validation && (
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                validation.passed
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              {validation.passed ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              {validation.passed ? "Validated" : "Issues Found"}
              {showValidation ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}

          {/* Status Indicator */}
          {status === "done" && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={12} /> Done
            </span>
          )}
          {isFailed && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle size={12} /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Validation Panel (Expandable) */}
      {showValidation && validation && (
        <div className="px-4 py-2.5 bg-black/40 border-b border-white/[0.06] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Validation Checks</span>
            <span className={validation.passed ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
              {validation.passed ? "All checks passed" : "Review warnings"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="flex items-center gap-1 text-slate-300">
              <span className={validation.completeness ? "text-emerald-400" : "text-red-400"}>●</span> Completeness
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className={validation.platformConstraints ? "text-emerald-400" : "text-amber-400"}>●</span> Platform Rules
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className={validation.safety ? "text-emerald-400" : "text-red-400"}>●</span> Safety / PII
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className={validation.grounding ? "text-emerald-400" : "text-amber-400"}>●</span> Grounding Check
            </div>
          </div>
          {validation.notes && validation.notes.length > 0 && (
            <div className="pt-1.5 border-t border-white/[0.04] text-[11px] text-slate-400 space-y-1">
              {validation.notes.map((n, i) => (
                <p key={i} className="text-amber-300/80">• {n}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[360px] text-[13px] text-slate-200 leading-relaxed [scrollbar-width:thin]">
        {isFailed ? (
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs">
            {data?.error || "Generation error encountered."}
          </div>
        ) : isEditing ? (
          <textarea
            value={displayText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={8}
            className="w-full bg-black/40 border border-indigo-500/30 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500 font-mono resize-y"
          />
        ) : downloadUrl ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-center bg-white/[0.02] rounded-xl border border-white/[0.04]">
            <div className={`p-3 rounded-2xl border ${config.color}`}>
              <Icon size={28} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{config.label} Ready</p>
              <p className="text-xs text-slate-400 mt-0.5">Binary export generated and stored in cloud.</p>
            </div>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-md shadow-indigo-600/20"
            >
              <Download size={14} /> Download Document
            </a>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{displayText}</Markdown>
          </div>
        )}
      </div>

      {/* Citations Footer */}
      {citations && citations.length > 0 && (
        <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.01]">
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 transition"
          >
            <span>Source Citations ({citations.length} anchors referenced)</span>
            {showCitations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showCitations && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {citations.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono"
                >
                  🔗 {typeof c === "string" ? c : c.chunkId || `Chunk ${i + 1}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-white/[0.06] bg-black/20">
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy content"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {!downloadUrl && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "Save edits" : "Edit content"}
              className={`p-1.5 rounded-lg transition ${
                isEditing ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
              }`}
            >
              <Edit3 size={14} />
            </button>
          )}

          <button
            onClick={() => setApproved(!approved)}
            title="Approve for publishing"
            className={`p-1.5 rounded-lg transition ${
              approved ? "bg-emerald-500/20 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
            }`}
          >
            <ThumbsUp size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(normType)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.06] transition"
            >
              <RefreshCw size={11} /> Regenerate
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition"
          >
            <Download size={11} /> Export JSON
          </button>
        </div>
      </div>
    </div>
  )
}
