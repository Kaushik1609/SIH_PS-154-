import React from 'react'
import ResultCard from './ResultCard'

export default function ResultsGrid({ results, onRegenerate }) {
  if (!results || Object.keys(results).length === 0) {
    return null
  }

  const entries = Object.entries(results)

  return (
    <div className="w-full my-3 space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Generated Outputs ({entries.length})
        </span>
        <span className="text-[11px] text-slate-500">
          All outputs grounded in uploaded source evidence
        </span>
      </div>

      <div className={`grid gap-4 ${entries.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
        {entries.map(([type, data]) => (
          <ResultCard
            key={type}
            type={type}
            data={data}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </div>
  )
}
