import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LuArrowUp, LuBot, LuMessageCircleOff } from 'react-icons/lu'
import { useAuth } from '../../contexts/AuthContext'
import api, { getErrorMessage } from '../../lib/api'
import { postEventStream } from '../../lib/sse'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import Alert from '../ui/Alert'
import EmptyState from '../ui/EmptyState'
import Markdown from '../ui/Markdown'
import Spinner from '../ui/Spinner'

const SUGGESTIONS = [
  'What if it rains on one of the days?',
  'Where can we eat near the day 1 activities?',
  'How should we get around between places?',
  'Is our budget realistic?',
]

const Message = ({ message, isMine }) => {
  if (message.role === 'assistant') {
    return (
      <li className="flex gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
          <LuBot className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 max-w-[42rem] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-700 shadow-sm ring-1 ring-slate-200">
          <p className="sr-only">Assistant:</p>
          {message.content ? <Markdown>{message.content}</Markdown> : <Spinner className="size-4 text-slate-400" />}
        </div>
      </li>
    )
  }

  return (
    <li className={cn('flex gap-3', isMine && 'flex-row-reverse')}>
      <Avatar user={message} />
      <div className={cn('min-w-0 max-w-[36rem]', isMine && 'text-right')}>
        {!isMine && <p className="mb-1 text-xs font-medium text-slate-500">{message.first_name}</p>}
        <p className={cn(
          'inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left text-[15px] leading-relaxed',
          isMine ? 'rounded-tr-md bg-brand-700 text-white' : 'rounded-tl-md bg-slate-200 text-slate-900',
        )}>
          {message.content}
        </p>
      </div>
    </li>
  )
}

const AssistantTab = ({ trip }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['trip', String(trip.id), 'chat']
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(null) // { user, reply } while a reply is in flight
  const [error, setError] = useState('')
  const abortRef = useRef(null)
  const listEndRef = useRef(null)

  const chatQuery = useQuery({
    queryKey,
    queryFn: () => api.get(`/trips/${trip.id}/chat`).then((r) => r.data),
  })

  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatQuery.data, streaming?.reply])

  const send = async (text) => {
    const message = text.trim()
    if (!message || streaming) return
    setError('')
    setDraft('')
    setStreaming({ user: { role: 'user', content: message, ...user, id: 'pending' }, reply: '' })
    abortRef.current = new AbortController()

    try {
      await postEventStream(`/trips/${trip.id}/chat`, { message }, {
        signal: abortRef.current.signal,
        onEvent: (event) => {
          if (event.type === 'delta') setStreaming((s) => ({ ...s, reply: s.reply + event.text }))
          if (event.type === 'error') setError(event.error)
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setDraft(message)
      }
    } finally {
      await queryClient.invalidateQueries({ queryKey })
      setStreaming(null)
    }
  }

  if (chatQuery.isLoading) return <Spinner className="text-brand-700" />
  if (chatQuery.isError) return <Alert>{getErrorMessage(chatQuery.error, 'Could not load the conversation')}</Alert>
  if (!chatQuery.data.enabled) {
    return (
      <EmptyState icon={LuMessageCircleOff} title="The assistant is switched off">
        This server has no AI key configured, so the trip assistant is unavailable.
      </EmptyState>
    )
  }

  const messages = chatQuery.data.messages

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50">
      <div className="max-h-[60vh] min-h-72 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 && !streaming ? (
          <div className="py-6 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <LuBot className="size-6" aria-hidden />
            </span>
            <h3 className="mt-4 font-semibold text-slate-900">Ask anything about this trip</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
              The assistant knows the itinerary, forecast, budget and packing list. Everyone in the group sees this chat.
            </p>
          </div>
        ) : (
          <ol className="space-y-5">
            {messages.map((m) => <Message key={m.id} message={m} isMine={m.user_id === user.id} />)}
            {streaming && (
              <>
                <Message message={streaming.user} isMine />
                <Message message={{ role: 'assistant', content: streaming.reply }} />
              </>
            )}
          </ol>
        )}
        <div ref={listEndRef} />
      </div>

      <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
        {error && <div className="mb-3"><Alert>{error}</Alert></div>}
        {messages.length === 0 && !streaming && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="min-h-9 rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-brand-600 hover:text-brand-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => { event.preventDefault(); send(draft) }}
        >
          <label htmlFor="chat-input" className="sr-only">Message the trip assistant</label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                send(draft)
              }
            }}
            placeholder="Ask about the plan, weather, food, getting around..."
            className="block max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-base focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
          />
          <button
            type="submit"
            disabled={!draft.trim() || Boolean(streaming)}
            aria-label="Send message"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
          >
            {streaming ? <Spinner className="size-4" /> : <LuArrowUp className="size-5" aria-hidden />}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AssistantTab
