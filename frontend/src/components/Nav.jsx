import React from 'react'
import { FileSpreadsheet, Sun, Moon } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useTheme } from '../context/ThemeContext'

function Nav() {
  const { selectedConversation } = useSelector(state => state.conversation)
  const { messages } = useSelector(state => state.message)
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className='h-11 flex items-center justify-between px-4 border-b shrink-0'
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {selectedConversation && (
          <>
            <div
              className='flex items-center justify-center w-6 h-6 rounded-sm shrink-0 boxy-curve'
              style={{
                backgroundColor: 'var(--accent-subtle)',
                borderColor: 'var(--border-color)',
                color: 'var(--accent-text)'
              }}
            >
              <FileSpreadsheet size={13} />
            </div>
            <div
              className='text-xs font-semibold tracking-tight truncate'
              style={{ color: 'var(--text-primary)' }}
            >
              {selectedConversation?.title || "Situation Brief"}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {selectedConversation && (
          <div
            className='text-[10px] font-medium px-2 py-0.5 rounded-sm shrink-0 boxy-curve border'
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-muted)'
            }}
          >
            {messages?.length} {messages?.length === 1 ? "entry" : "entries"}
          </div>
        )}

        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className='flex items-center justify-center w-7 h-7 rounded-sm boxy-curve border cursor-pointer'
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)'
          }}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </div>
  )
}

export default Nav
