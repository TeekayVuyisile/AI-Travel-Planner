import { TOKEN_KEY } from './api'

// POSTs JSON and reads a text/event-stream response, calling onEvent for each `data:` payload.
// axios cannot stream response bodies in the browser, so this uses fetch directly.
export const postEventStream = async (path, body, { onEvent, signal }) => {
  const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || data.errors?.[0]?.msg || 'The assistant is unavailable right now')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop()
    for (const event of events) {
      const line = event.split('\n').find((l) => l.startsWith('data: '))
      if (line) onEvent(JSON.parse(line.slice(6)))
    }
  }
}
