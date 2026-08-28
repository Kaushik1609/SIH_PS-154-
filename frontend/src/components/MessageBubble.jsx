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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-2`}>
      <div
        className={`w-fit max-w-[95vw] md:max-w-[85%] px-4 py-3 rounded-2xl break-words leading-relaxed ${
          isUser
            ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-sm"
            : "bg-[#141721] border border-white/[0.06] text-slate-200 rounded-tl-sm shadow-lg"
        }`}
      >
        {/* Render Multi-output Results Grid if present */}
        {hasResults ? (
          <div>
            {content && content !== "Generation complete." && (
              <p className="text-xs text-slate-400 mb-3">{content}</p>
            )}
            <ResultsGrid results={results} />
          </div>
        ) : (
          <>
            {images && images.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt="attachment"
                    onClick={() => setLightBox(img)}
                    loading="lazy"
                    onError={(e) => e.currentTarget.remove()}
                    className="w-40 h-28 rounded-xl object-cover border border-white/10 cursor-zoom-in hover:opacity-90 transition"
                  />
                ))}
              </div>
            )}

            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="mb-2 whitespace-pre-wrap break-words text-sm">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2 text-sm">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-sm">{children}</ol>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border border-white/10 text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-white/10 bg-white/5 px-3 py-1.5 text-left font-semibold">{children}</th>
                ),
                td: ({ children }) => <td className="border border-white/10 px-3 py-1.5">{children}</td>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 underline inline-flex items-center gap-1">
                    {children}
                    <ExternalLink size={12} />
                  </a>
                ),
                code: ({ className, children }) => {
                  const value = String(children).trim()
                  if (!className) {
                    return <code className="px-1.5 py-0.5 rounded bg-white/10 text-indigo-200 text-xs">{value}</code>
                  }
                  const language = className.replace("language-", "")
                  return (
                    <div className="my-3 overflow-hidden rounded-xl border border-white/10 bg-[#111318]">
                      <div className="flex items-center justify-between bg-[#1b1d24] border-b border-white/10 px-3 py-1.5">
                        <span className="uppercase text-[11px] text-slate-400">{language}</span>
                        <button className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white" onClick={() => copyCode(value)}>
                          {copiedCode === value ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        wrapLongLines
                        customStyle={{
                          margin: 0,
                          padding: "12px",
                          background: "#0d1117",
                          fontSize: "12px"
                        }}
                      >
                        {value}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setLightBox(null)}>
          <button className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 rounded-full p-2" onClick={() => setLightBox(null)}>
            <X size={20} />
          </button>
          <img src={lightBox} alt="lightbox" className="max-w-[90vw] max-h-[85vh] rounded-2xl border border-white/10 shadow-2xl object-contain" />
        </div>
      )}
    </div>
  )
}

export default MessageBubble
