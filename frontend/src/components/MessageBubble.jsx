import { Check, Copy, ExternalLink, X } from 'lucide-react'
import React, { useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ResultsGrid from './ResultsGrid'

function MessageBubble({ role, content, images, results }) {
  const isUser = role === "user"
  const [lightBox, setLightBox] = useState(null)
  const [copiedCode, setCopiedCode] = useState("")

  const copyCode = async (code) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode("")
    }, 2000)
  }

  const hasResults = results && Object.keys(results).length > 0

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-1.5`}>
      <div
        className={`w-fit max-w-[90vw] md:max-w-[78%] px-3 py-2 rounded-sm boxy-curve break-words leading-relaxed border transition-all text-xs ${
          isUser
            ? "text-white"
            : ""
        }`}
        style={{
          backgroundColor: isUser ? 'var(--accent)' : 'var(--bg-secondary)',
          borderColor: isUser ? 'var(--accent)' : 'var(--border-color)',
          color: isUser ? '#ffffff' : 'var(--text-primary)'
        }}
      >
        {/* Render Multi-output Results Grid if present */}
        {hasResults ? (
          <div>
            {content && content !== "Generation complete." && (
              <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{content}</p>
            )}
            <ResultsGrid results={results} />
          </div>
        ) : (
          <>
            {images && images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt="attachment"
                    onClick={() => setLightBox(img)}
                    loading="lazy"
                    onError={(e) => e.currentTarget.remove()}
                    className="w-32 h-20 rounded-sm boxy-curve object-cover border cursor-zoom-in hover:opacity-90 transition"
                    style={{ borderColor: 'var(--border-color)' }}
                  />
                ))}
              </div>
            )}

            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-sm font-bold mt-2 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xs font-semibold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-semibold mt-1.5 mb-0.5">{children}</h3>,
                p: ({ children }) => <p className="mb-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1 text-xs">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1 text-xs">{children}</ol>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border text-[11px]" style={{ borderColor: 'var(--border-color)' }}>{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border px-2 py-1 text-left font-semibold" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>{children}</th>
                ),
                td: ({ children }) => <td className="border px-2 py-1" style={{ borderColor: 'var(--border-color)' }}>{children}</td>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5" style={{ color: 'var(--accent-text)' }}>
                    {children}
                    <ExternalLink size={10} />
                  </a>
                ),
                code: ({ className, children }) => {
                  const val = String(children).trim()
                  if (!className) {
                    return (
                      <code
                        className="px-1 py-0.2 rounded-xs text-[11px]"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {val}
                      </code>
                    )
                  }
                  const language = className.replace("language-", "")
                  return (
                    <div className="my-2 overflow-hidden rounded-sm boxy-curve border" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center justify-between px-2.5 py-1 border-b text-[10px]" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                        <span className="uppercase font-mono">{language}</span>
                        <button className="flex items-center gap-1 cursor-pointer hover:opacity-80" onClick={() => copyCode(val)}>
                          {copiedCode === val ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        wrapLongLines
                        customStyle={{
                          margin: 0,
                          padding: "8px 12px",
                          background: "var(--bg-primary)",
                          fontSize: "11px"
                        }}
                      >
                        {val}
                      </SyntaxHighlighter>
                    </div>
                  )
                }
              }}
            >
              {content}
            </Markdown>
          </>
        )}
      </div>

      {lightBox && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setLightBox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-1.5 cursor-pointer" onClick={() => setLightBox(null)}>
            <X size={16} />
          </button>
          <img src={lightBox} alt="lightbox" className="max-w-[85vw] max-h-[80vh] rounded-sm boxy-curve border shadow-xl object-contain" style={{ borderColor: 'var(--border-color)' }} />
        </div>
      )}
    </div>
  )
}

export default MessageBubble
