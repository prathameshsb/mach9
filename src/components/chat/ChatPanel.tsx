'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage, BridgeFilters } from '@/lib/types'

interface ChatPanelProps {
  isOpen: boolean
  onClose: () => void
  onFiltersApplied: (filters: BridgeFilters) => void
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: "Hi! Ask me about Pennsylvania's 23,202 bridges. Try: \"Show structurally deficient bridges in Philadelphia\" or \"Find steel bridges built before 1950\"",
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-3 py-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export default function ChatPanel({ isOpen, onClose, onFiltersApplied }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit() {
    const text = input.trim()
    if (!text || loading) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const history = messages.filter(m => m !== WELCOME)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply ?? 'Sorry, I couldn\'t process that.',
        filters: data.filters,
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.filters && Object.keys(data.filters).length > 0) {
        onFiltersApplied(data.filters)
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[520px] bg-white rounded-xl shadow-2xl flex flex-col z-40 border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-sm text-gray-900">Bridge AI</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              )}
            >
              {msg.content}
              {msg.filters && Object.keys(msg.filters).length > 0 && (
                <p className="text-xs mt-1 opacity-70">✓ Filters applied</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about bridges..."
            disabled={loading}
            rows={1}
            className={cn(
              'flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'placeholder-gray-400 disabled:opacity-50',
              'max-h-24 overflow-y-auto'
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="p-2 bg-blue-500 text-white rounded-xl disabled:opacity-40 hover:bg-blue-600 transition-colors flex-shrink-0"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
