import React from 'react'
import ResultCard from './ResultCard'

export default function ResultsGrid({ results, onRegenerate }) {
  if (!results || Object.keys(results).length === 0) {
    return null
  }

  const entries = Object.entries(results)

  return (
    <div className="w-full my-2 space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span
          className="text-[10.5px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Generated Outputs ({entries.length})
        </span>
        <span
          className="text-[9.5px]"
          style={{ color: 'var(--text-muted)' }}
        >
          Grounded in source evidence
        </span>
      </div>

      <div className={`grid gap-2.5 ${entries.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
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
