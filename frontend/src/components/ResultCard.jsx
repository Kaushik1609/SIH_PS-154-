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
  ShieldAlert
} from 'lucide-react'
import { FaLinkedin, FaXTwitter } from 'react-icons/fa6'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const TYPE_CONFIG = {
  advisory: { label: "Advisory", icon: FileText },
  executivesummary: { label: "Executive Summary", icon: FileText },
  videoscript: { label: "Video Script", icon: Video },
  presentation: { label: "Presentation (PPTX)", icon: Presentation },
  infographic: { label: "Infographic Plan", icon: BarChart3 },
  linkedin: { label: "LinkedIn Post", icon: FaLinkedin },
  twitter: { label: "X / Twitter Post", icon: FaXTwitter }
}

export default function ResultCard({ type, data, onRegenerate }) {
  const normType = type?.toLowerCase()?.trim()
  const config = TYPE_CONFIG[normType] || {
    label: type,
    icon: FileText
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
    <div
      className="flex flex-col rounded-sm boxy-curve border overflow-hidden shadow-sm transition-all"
      style={{
        backgroundColor: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="p-1 rounded-sm boxy-curve border"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              borderColor: 'var(--border-color)',
              color: 'var(--accent-text)'
            }}
          >
            <Icon size={13} />
          </div>
          <div>
            <h4 className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{config.label}</h4>
            <span className="text-[9.5px] capitalize block -mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {status === "done" ? (approved ? "Approved" : "Ready") : status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Validation Status Badge */}
          {validation && (
            <button
              onClick={() => setShowValidation(!showValidation)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm boxy-curve text-[10px] font-medium border cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: validation.passed ? 'var(--text-secondary)' : '#d97706'
              }}
            >
              {validation.passed ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
              <span>{validation.passed ? "Checked" : "Issues"}</span>
              {showValidation ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>
          )}

          {/* Status Indicator */}
          {status === "done" && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm boxy-curve text-[10px] font-medium border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--accent-text)'
              }}
            >
              <CheckCircle2 size={10} /> Done
            </span>
          )}
          {isFailed && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm boxy-curve text-[10px] font-medium border"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444'
              }}
            >
              <AlertTriangle size={10} /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Validation Panel */}
      {showValidation && validation && (
        <div
          className="px-3 py-2 border-b text-[11px] space-y-1"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span>Verification Checks</span>
            <span style={{ color: validation.passed ? 'var(--accent-text)' : '#d97706' }}>
              {validation.passed ? "All checks passed" : "Review notes"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px]">
            <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <span>●</span> Completeness: {validation.completeness ? "OK" : "Warn"}
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <span>●</span> Platform: {validation.platformConstraints ? "OK" : "Warn"}
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <span>●</span> Safety: {validation.safety ? "OK" : "Warn"}
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <span>●</span> Grounding: {validation.grounding ? "OK" : "Warn"}
            </div>
          </div>
          {validation.notes && validation.notes.length > 0 && (
            <div className="pt-1 border-t text-[10px] space-y-0.5" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
              {validation.notes.map((n, i) => (
                <p key={i}>• {n}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div
        className="p-3 flex-1 overflow-y-auto max-h-[250px] text-xs leading-relaxed [scrollbar-width:thin]"
        style={{ color: 'var(--text-primary)' }}
      >
        {isFailed ? (
          <div
            className="rounded-sm boxy-curve p-2.5 text-xs border"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444'
            }}
          >
            {data?.error || "Generation error encountered."}
          </div>
        ) : isEditing ? (
          <textarea
            value={displayText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={6}
            className="w-full rounded-sm boxy-curve p-2 text-xs outline-none font-mono resize-y border"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          />
        ) : downloadUrl ? (
          <div
            className="flex flex-col items-center justify-center py-4 gap-2 text-center rounded-sm boxy-curve border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-color)'
            }}
          >
            <div
              className="p-2 rounded-sm boxy-curve border"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                borderColor: 'var(--border-color)',
                color: 'var(--accent-text)'
              }}
            >
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{config.label} Export</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Document ready for download</p>
            </div>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm boxy-curve text-xs font-medium transition cursor-pointer text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <Download size={12} /> Download
            </a>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-xs" style={{ color: 'var(--text-primary)' }}>
            <Markdown remarkPlugins={[remarkGfm]}>{displayText}</Markdown>
          </div>
        )}
      </div>

      {/* Citations Footer */}
      {citations && citations.length > 0 && (
        <div
          className="px-3 py-1.5 border-t text-[10px]"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-color)'
          }}
        >
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="flex items-center justify-between w-full cursor-pointer hover:opacity-80 transition"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Citations ({citations.length})</span>
            {showCitations ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {showCitations && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {citations.map((c, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded-sm boxy-curve border text-[9.5px] font-mono"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--accent-text)'
                  }}
                >
                  🔗 {typeof c === "string" ? c : c.chunkId || `Chunk ${i + 1}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div
        className="flex items-center justify-between px-2.5 py-1.5 border-t"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy content"
            className="p-1 rounded-sm boxy-curve border-none cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--accent-text)' }} /> : <Copy size={12} />}
          </button>

          {!downloadUrl && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? "Save edits" : "Edit content"}
              className="p-1 rounded-sm boxy-curve border-none cursor-pointer"
              style={{
                backgroundColor: isEditing ? 'var(--accent)' : 'transparent',
                color: isEditing ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <Edit3 size={12} />
            </button>
          )}

          <button
            onClick={() => setApproved(!approved)}
            title="Mark reviewed"
            className="p-1 rounded-sm boxy-curve border-none cursor-pointer"
            style={{
              backgroundColor: approved ? 'var(--accent-subtle)' : 'transparent',
              color: approved ? 'var(--accent-text)' : 'var(--text-secondary)'
            }}
          >
            <ThumbsUp size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(normType)}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-sm boxy-curve border cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-secondary)'
              }}
            >
              <RefreshCw size={10} /> Redo
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-sm boxy-curve border cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-subtle)',
              borderColor: 'var(--border-color)',
              color: 'var(--accent-text)'
            }}
          >
            <Download size={10} /> JSON
          </button>
        </div>
      </div>
    </div>
  )
}
